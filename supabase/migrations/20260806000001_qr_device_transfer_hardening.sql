-- Hardens the QR device-transfer flow to match the full spec:
--   * 60s (not 5min) QR expiry, single-use, regenerated on expiry (client-driven)
--   * scanning no longer auto-approves - old device must explicitly confirm
--     via a preview/approve split, so the UI can show a confirmation sheet
--   * an explicit cancel path that destroys the token without denying the
--     underlying request (the new device can just generate a new code)
--   * escalating lockout on the recovery-code step (mirrors the existing
--     face_verification_* pattern on profiles)
--   * delayed activation ("please wait 1-5 minutes") processed by a
--     background job instead of instantly, with an in-app notification
--     standing in for SMS (no SMS vendor is wired into this project)
--   * a cooldown after a successful transfer before another may start

-- ===== profiles: recovery-code lockout + post-transfer cooldown =====
alter table public.profiles
  add column device_transfer_recovery_failure_count int not null default 0,
  add column device_transfer_recovery_locked_until timestamptz,
  add column device_transfer_recovery_disabled boolean not null default false,
  add column device_transfer_cooldown_until timestamptz;

create or replace function public.guard_profiles_restricted_columns()
returns trigger
language plpgsql
as $$
begin
  if new.pin_hash is distinct from old.pin_hash
     and coalesce(current_setting('app.allow_restricted_profile_write', true), 'false') <> 'true' then
    raise exception 'pin_hash cannot be changed directly; use set_login_pin()';
  end if;

  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.role() <> 'service_role' then
    raise exception 'role/status cannot be changed directly by the mobile app';
  end if;

  if (new.approval_status is distinct from old.approval_status
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.approval_rejection_reason is distinct from old.approval_rejection_reason)
     and auth.role() <> 'service_role' then
    raise exception 'approval fields can only be changed by an administrator';
  end if;

  if (new.face_verification_failure_count is distinct from old.face_verification_failure_count
      or new.face_verification_locked_until is distinct from old.face_verification_locked_until
      or new.face_verification_disabled is distinct from old.face_verification_disabled)
     and auth.role() <> 'service_role' then
    raise exception 'face verification lockout fields can only be changed by the verification process';
  end if;

  if (new.device_transfer_recovery_failure_count is distinct from old.device_transfer_recovery_failure_count
      or new.device_transfer_recovery_locked_until is distinct from old.device_transfer_recovery_locked_until
      or new.device_transfer_recovery_disabled is distinct from old.device_transfer_recovery_disabled
      or new.device_transfer_cooldown_until is distinct from old.device_transfer_cooldown_until)
     and auth.role() <> 'service_role' then
    raise exception 'device transfer lockout/cooldown fields can only be changed by the transfer process';
  end if;

  return new;
end;
$$;

-- ===== device_transfer_requests: new statuses for the delayed-activation step =====
alter table public.device_transfer_requests drop constraint device_transfer_requests_status_check;
alter table public.device_transfer_requests add constraint device_transfer_requests_status_check
  check (status in ('pending', 'approved', 'activating', 'completed', 'denied', 'cancelled', 'expired'));

alter table public.device_transfer_requests add column activates_at timestamptz;

-- ===== settings this feature reads =====
insert into public.system_settings (key, value, description) values
  ('new_device_activation_delay_minutes', '3', 'Minutes to wait between recovery-code confirmation and actual device activation'),
  ('device_transfer_cooldown_hours', '2', 'Hours to wait after a completed device transfer before another may be started')
on conflict (key) do nothing;

-- ===== QR expiry: 60 seconds, not 5 minutes =====
create or replace function public.create_qr_transfer_code(p_request_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires_at timestamptz := now() + interval '60 seconds';
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

  -- Only one live code per request - regenerating (e.g. on expiry) retires
  -- any code still outstanding for this request.
  update public.qr_transfer_codes
  set status = 'expired'
  where device_transfer_request_id = p_request_id and status = 'pending';

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

-- ===== Preview: called by the OLD device right after scanning, before it
-- shows the confirmation sheet. Validates ownership/expiry but does NOT
-- consume the code or change any status, so scanning alone can never
-- approve a transfer. =====
create or replace function public.preview_qr_transfer(p_code text)
returns table (request_id uuid, device_name text, platform text, requested_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qr public.qr_transfer_codes;
  v_request public.device_transfer_requests;
  v_device public.devices;
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

  select * into v_request from public.device_transfer_requests where id = v_qr.device_transfer_request_id;
  select * into v_device from public.devices where id = v_request.to_device_id;

  return query select v_request.id, v_device.device_name, v_device.platform, v_request.requested_at;
end;
$$;

-- ===== Final decision from the old device's confirmation sheet. Re-validates
-- everything preview_qr_transfer checked (the code cannot have been used or
-- expired meanwhile) before consuming it. =====
create or replace function public.approve_qr_transfer(p_code text, p_approve boolean default true)
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

  if p_approve then
    update public.device_transfer_requests
    set status = 'approved', resolved_at = now()
    where id = v_qr.device_transfer_request_id;

    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
    values (auth.uid(), 'device_transfer_request.qr_approved', 'device_transfer_requests', v_qr.device_transfer_request_id);
  else
    update public.device_transfer_requests
    set status = 'cancelled', resolved_at = now()
    where id = v_qr.device_transfer_request_id;

    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
    values (auth.uid(), 'device_transfer_request.qr_cancelled', 'device_transfer_requests', v_qr.device_transfer_request_id);
  end if;
end;
$$;

-- ===== Called by the NEW device when a screenshot/screen-recording is
-- detected while the QR is on screen, or the customer backs out. Destroys
-- the outstanding token; a fresh scan attempt requires a fresh code. =====
create or replace function public.cancel_device_transfer(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.qr_transfer_codes
  set status = 'expired'
  where device_transfer_request_id = p_request_id and status = 'pending';

  update public.device_transfer_requests
  set status = 'cancelled', resolved_at = now()
  where id = p_request_id and user_id = auth.uid() and status in ('pending', 'approved');

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'device_transfer_request.cancelled', 'device_transfer_requests', p_request_id);
end;
$$;

-- ===== Step 2: recovery code, now with escalating lockout and delayed
-- (not instant) activation. =====
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
  v_disabled boolean;
  v_locked_until timestamptz;
  v_failure_count int;
  v_lock_hours int;
  v_delay_minutes int;
  v_activates_at timestamptz;
begin
  select device_transfer_recovery_disabled, device_transfer_recovery_locked_until
    into v_disabled, v_locked_until
  from public.profiles where id = auth.uid();

  if v_disabled then
    raise exception 'Your account has been temporarily blocked on this new device. Please visit the nearest branch to reactivate your account.';
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'Too many incorrect attempts. Please try again after %.', v_locked_until;
  end if;

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
    update public.profiles
    set device_transfer_recovery_failure_count = device_transfer_recovery_failure_count + 1
    where id = auth.uid()
    returning device_transfer_recovery_failure_count into v_failure_count;

    if v_failure_count >= 7 then
      update public.profiles
      set device_transfer_recovery_disabled = true, device_transfer_recovery_locked_until = null
      where id = auth.uid();
      raise exception 'Your account has been temporarily blocked on this new device. Please visit the nearest branch to reactivate your account.';
    end if;

    -- 1st failure: retry immediately. 2nd: 1h, 3rd: 3h, 4th: 6h, 5th: 12h,
    -- 6th+: 24h (the max before the account gets fully blocked above).
    v_lock_hours := case v_failure_count
      when 1 then 0
      when 2 then 1
      when 3 then 3
      when 4 then 6
      when 5 then 12
      else 24
    end;

    if v_lock_hours > 0 then
      update public.profiles
      set device_transfer_recovery_locked_until = now() + make_interval(hours => v_lock_hours)
      where id = auth.uid();
      raise exception 'Incorrect Security Recovery Code. Please try again after % hour(s).', v_lock_hours;
    end if;

    raise exception 'Incorrect Security Recovery Code';
  end if;

  update public.profiles
  set device_transfer_recovery_failure_count = 0, device_transfer_recovery_locked_until = null
  where id = auth.uid();

  select coalesce((select value from public.system_settings where key = 'new_device_activation_delay_minutes')::int, 3)
    into v_delay_minutes;
  v_activates_at := now() + make_interval(mins => v_delay_minutes);

  update public.device_transfer_requests
  set status = 'activating', activates_at = v_activates_at
  where id = p_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'device_transfer_request.recovery_code_verified', 'device_transfer_requests', p_request_id,
          jsonb_build_object('activates_at', v_activates_at));

  insert into public.notifications (user_id, title, body, type)
  values (auth.uid(), 'Device activation in progress', 'Your account is being activated on the new device. Please wait 1-5 minutes.', 'security');

  -- Stand-in for an SMS provider: no SMS vendor is wired into this project,
  -- so the "Your new device is being verified..." text is recorded here for
  -- audit purposes and shown in-app instead.
  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'sms.device_transfer_pending', 'device_transfer_requests', p_request_id,
          jsonb_build_object('body', 'Your new device is being verified. Please wait 1-5 minutes.'));
end;
$$;

-- ===== Background job: activates any request whose delay has elapsed.
-- Runs as a scheduled job (see below), not on the client's behalf, so it
-- sets the activation-allow flag itself. =====
create or replace function public.process_pending_device_activations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_cooldown_hours int;
begin
  for v_request in
    select * from public.device_transfer_requests
    where status = 'activating' and activates_at <= now()
  loop
    perform set_config('app.allow_device_activation', 'true', true);

    update public.devices set status = 'active', last_login_at = now()
    where id = v_request.to_device_id;

    if v_request.from_device_id is not null then
      update public.devices set status = 'transferred'
      where id = v_request.from_device_id;
    end if;

    update public.device_transfer_requests
    set status = 'completed', resolved_at = now()
    where id = v_request.id;

    select coalesce((select value from public.system_settings where key = 'device_transfer_cooldown_hours')::int, 2)
      into v_cooldown_hours;

    update public.profiles
    set device_transfer_cooldown_until = now() + make_interval(hours => v_cooldown_hours)
    where id = v_request.user_id;

    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
    values (v_request.user_id, 'device_transfer_request.completed', 'device_transfer_requests', v_request.id);

    insert into public.notifications (user_id, title, body, type)
    values (v_request.user_id, 'New device activated', 'Your account is now active on this device. Your previous device has been disabled.', 'security');
  end loop;
end;
$$;

-- Best-effort: schedule the job via pg_cron if the extension is available in
-- this environment. If pg_cron cannot be enabled here (e.g. local dev, or a
-- hosting tier without it), process_pending_device_activations() can still
-- be invoked manually/by an external scheduler with the service role.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'process-pending-device-activations',
    '* * * * *',
    $job$select public.process_pending_device_activations();$job$
  );
exception when others then
  raise notice 'pg_cron unavailable in this environment - schedule process_pending_device_activations() externally.';
end;
$$;

-- ===== Cooldown enforcement: block starting a new transfer while one is
-- still on cooldown. =====
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
  v_cooldown_until timestamptz;
begin
  if p_verification_method not in ('qr_code', 'face_id', 'fingerprint') then
    raise exception 'Invalid verification method';
  end if;

  select device_transfer_cooldown_until into v_cooldown_until
  from public.profiles where id = auth.uid();

  if v_cooldown_until is not null and v_cooldown_until > now() then
    raise exception 'Device transfer is temporarily unavailable. Please wait before requesting another device transfer.';
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

grant execute on function public.preview_qr_transfer(text) to authenticated;
grant execute on function public.approve_qr_transfer(text, boolean) to authenticated;
grant execute on function public.cancel_device_transfer(uuid) to authenticated;
