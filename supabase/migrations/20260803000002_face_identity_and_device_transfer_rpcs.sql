-- Non-secret settings the mobile app needs to read at runtime.
-- system_settings itself denies all client access (admin-only); this
-- exposes only a whitelisted subset as plain booleans/numbers.
create or replace function public.get_public_settings()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_object_agg(key, value)
  from public.system_settings
  where key in (
    'face_id_available', 'fingerprint_available', 'qr_code_available',
    'min_transfer_amount', 'max_transfer_amount', 'new_device_activation_delay_minutes'
  );
$$;

grant execute on function public.get_public_settings() to authenticated;

-- Seed the two new toggles this feature reads (existing ones from Phase 3
-- Settings are untouched).
insert into public.system_settings (key, value, description) values
  ('face_id_available', 'true', 'Whether users may register/use JOJO Face Identity'),
  ('qr_code_available', 'true', 'Whether QR-based device transfer is enabled')
on conflict (key) do nothing;

-- ===== First Face ID =====
create or replace function public.submit_first_face_identity(p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select value from public.system_settings where key = 'face_id_available')::boolean, true) is not true then
    raise exception 'JOJO Face Identity registration is currently disabled';
  end if;

  if exists (select 1 from public.face_identities where user_id = auth.uid()) then
    raise exception 'A Face Identity already exists for this account';
  end if;

  insert into public.face_identities (user_id, storage_path)
  values (auth.uid(), p_storage_path);

  insert into public.audit_logs (actor_user_id, action, entity_table)
  values (auth.uid(), 'face_identity.created', 'face_identities');
end;
$$;

-- ===== Start a device transfer (called by the NEW/unrecognized device) =====
create or replace function public.start_device_transfer(
  p_verification_method text,
  p_device_installation_id text,
  p_device_name text,
  p_platform text
)
returns table (request_id uuid, to_device_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to_device_id uuid;
  v_from_device_id uuid;
  v_request_id uuid;
begin
  if p_verification_method not in ('qr_code', 'face_id', 'fingerprint') then
    raise exception 'Invalid verification method';
  end if;

  select id into v_from_device_id
  from public.devices
  where user_id = auth.uid() and status = 'active'
  limit 1;

  insert into public.devices (user_id, device_installation_id, device_name, platform, status)
  values (auth.uid(), p_device_installation_id, p_device_name, p_platform, 'pending')
  on conflict (device_installation_id) do update set device_name = excluded.device_name
  returning id into v_to_device_id;

  insert into public.device_transfer_requests (user_id, from_device_id, to_device_id, verification_method, status)
  values (auth.uid(), v_from_device_id, v_to_device_id, p_verification_method, 'pending')
  returning id into v_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'device_transfer_request.started', 'device_transfer_requests', v_request_id,
          jsonb_build_object('verification_method', p_verification_method));

  return query select v_request_id, v_to_device_id;
end;
$$;

-- ===== QR transfer =====
create or replace function public.create_qr_transfer_code(p_request_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires_at timestamptz := now() + interval '5 minutes';
  v_qr_id uuid;
begin
  if coalesce((select value from public.system_settings where key = 'qr_code_available')::boolean, true) is not true then
    raise exception 'QR Code device transfer is currently disabled';
  end if;

  if not exists (
    select 1 from public.device_transfer_requests
    where id = p_request_id and user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'Device transfer request not found';
  end if;

  v_code := encode(extensions.gen_random_bytes(16), 'hex');

  insert into public.qr_transfer_codes (user_id, device_transfer_request_id, code, expires_at)
  values (auth.uid(), p_request_id, v_code, v_expires_at)
  returning id into v_qr_id;

  update public.device_transfer_requests
  set qr_transfer_code_id = v_qr_id
  where id = p_request_id;

  return query select v_code, v_expires_at;
end;
$$;

-- Called by the OLD (already trusted) device after scanning the QR shown
-- on the new device. Structurally cannot approve another account's
-- transfer: the code's user_id must match the CALLER's own auth.uid().
create or replace function public.approve_qr_transfer(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qr public.qr_transfer_codes;
begin
  select * into v_qr
  from public.qr_transfer_codes
  where code = p_code and status = 'pending' and expires_at > now();

  if v_qr.id is null then
    raise exception 'This QR Code has expired or is invalid';
  end if;

  if v_qr.user_id <> auth.uid() then
    raise exception 'This QR Code does not belong to your account';
  end if;

  update public.qr_transfer_codes set status = 'used' where id = v_qr.id;

  update public.device_transfer_requests
  set status = 'approved', resolved_at = now()
  where id = v_qr.device_transfer_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'device_transfer_request.qr_approved', 'device_transfer_requests', v_qr.device_transfer_request_id);
end;
$$;

-- ===== Face transfer (Last Face ID) =====
create or replace function public.submit_face_verification_attempt(
  p_request_id uuid,
  p_storage_path text,
  p_challenge jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked_until timestamptz;
  v_disabled boolean;
  v_attempt_id uuid;
begin
  select face_verification_locked_until, face_verification_disabled
    into v_locked_until, v_disabled
  from public.profiles where id = auth.uid();

  if v_disabled then
    raise exception 'Face Verification has been disabled for this account. Please visit a JOJO agency.';
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'Face Verification is temporarily locked. Try again later.';
  end if;

  if not exists (
    select 1 from public.device_transfer_requests
    where id = p_request_id and user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'Device transfer request not found';
  end if;

  insert into public.face_verification_attempts (user_id, device_transfer_request_id, last_face_path, challenge)
  values (auth.uid(), p_request_id, p_storage_path, p_challenge)
  returning id into v_attempt_id;

  update public.device_transfer_requests
  set face_verification_attempt_id = v_attempt_id
  where id = p_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'face_verification_attempt.submitted', 'face_verification_attempts', v_attempt_id);

  return v_attempt_id;
end;
$$;

-- ===== Step 2: recovery code + device activation =====
create or replace function public.complete_device_transfer(p_request_id uuid, p_recovery_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.device_transfer_requests;
  v_recovery_id uuid;
  v_decrypted text;
begin
  select * into v_request
  from public.device_transfer_requests
  where id = p_request_id and user_id = auth.uid() and status = 'approved';

  if v_request.id is null then
    raise exception 'This device transfer has not passed verification yet';
  end if;

  select id, extensions.pgp_sym_decrypt(code_encrypted, 'jojo-recovery-code-enc-key-v1-change-before-prod')
    into v_recovery_id, v_decrypted
  from public.security_recovery_codes
  where user_id = auth.uid();

  if v_recovery_id is null or v_decrypted is distinct from upper(p_recovery_code) then
    raise exception 'Incorrect Security Recovery Code';
  end if;

  perform set_config('app.allow_device_activation', 'true', true);

  update public.devices set status = 'active', last_login_at = now()
  where id = v_request.to_device_id;

  if v_request.from_device_id is not null then
    update public.devices set status = 'transferred'
    where id = v_request.from_device_id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'device_transfer_request.completed', 'device_transfer_requests', p_request_id);

  insert into public.notifications (user_id, title, body, type)
  values (auth.uid(), 'New device activated', 'Your account is now active on this device. Your previous device has been disabled.', 'security');
end;
$$;

-- ===== Admin: manual review substitutes for the not-yet-integrated AI
-- model. Structured so a real AI provider can call these same functions
-- (via service role) once available, instead of requiring a human. =====
create or replace function public.admin_approve_face_verification(p_attempt_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.face_verification_attempts;
begin
  select * into v_attempt from public.face_verification_attempts where id = p_attempt_id;
  if v_attempt.id is null then
    raise exception 'Verification attempt not found';
  end if;

  update public.face_verification_attempts
  set status = 'approved', resolved_at = now()
  where id = p_attempt_id;

  update public.device_transfer_requests
  set status = 'approved', resolved_at = now()
  where id = v_attempt.device_transfer_request_id;

  update public.profiles set face_verification_failure_count = 0 where id = v_attempt.user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'face_verification_attempt.approved', 'face_verification_attempts', p_attempt_id);

  insert into public.notifications (user_id, title, body, type)
  values (v_attempt.user_id, 'Face Verification approved', 'Your identity has been verified. Continue on your new device.', 'security');
end;
$$;

create or replace function public.admin_reject_face_verification(p_attempt_id uuid, p_admin_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.face_verification_attempts;
  v_failure_count int;
  v_lock_hours int;
begin
  select * into v_attempt from public.face_verification_attempts where id = p_attempt_id;
  if v_attempt.id is null then
    raise exception 'Verification attempt not found';
  end if;

  update public.face_verification_attempts
  set status = 'rejected', resolved_at = now(), ai_result = jsonb_build_object('reason', p_reason)
  where id = p_attempt_id;

  update public.device_transfer_requests
  set status = 'denied', resolved_at = now()
  where id = v_attempt.device_transfer_request_id;

  update public.profiles
  set face_verification_failure_count = face_verification_failure_count + 1
  where id = v_attempt.user_id
  returning face_verification_failure_count into v_failure_count;

  v_lock_hours := least(v_failure_count, 3);

  if v_failure_count >= 3 then
    update public.profiles
    set face_verification_disabled = true, face_verification_locked_until = null
    where id = v_attempt.user_id;

    insert into public.notifications (user_id, title, body, type)
    values (
      v_attempt.user_id, 'Face Verification disabled',
      'For your security, Face Verification has been disabled. Please visit a JOJO agency to recover your account.',
      'security'
    );
  else
    update public.profiles
    set face_verification_locked_until = now() + make_interval(hours => v_lock_hours)
    where id = v_attempt.user_id;

    insert into public.notifications (user_id, title, body, type)
    values (
      v_attempt.user_id, 'Face Verification failed',
      format('Verification failed. Please try again in %s hour(s).', v_lock_hours),
      'security'
    );
  end if;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id, metadata)
  values (p_admin_id, 'face_verification_attempt.rejected', 'face_verification_attempts', p_attempt_id,
          jsonb_build_object('reason', p_reason, 'failure_count', v_failure_count));
end;
$$;

create or replace function public.admin_reactivate_face_verification(p_user_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set face_verification_disabled = false, face_verification_failure_count = 0, face_verification_locked_until = null
  where id = p_user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'face_verification.reactivated', 'profiles', p_user_id);

  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, 'Face Verification reactivated', 'An administrator has reactivated Face Verification for your account.', 'security');
end;
$$;

create or replace function public.admin_reinitialize_face_identity(p_user_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.face_identities where user_id = p_user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'face_identity.reinitialized', 'face_identities', p_user_id);

  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, 'Face Identity reset', 'Your JOJO Face Identity has been reset by an administrator. You may create a new one from the app.', 'security');
end;
$$;
