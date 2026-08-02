-- Supporting an admin-authorized one-time re-view of an EXISTING recovery
-- code is cryptographically impossible with a one-way hash (bcrypt/crypt())
-- - that's the whole point of hashing, it cannot be reversed by anyone,
-- including us. To support this requirement, the code is now stored using
-- reversible symmetric encryption (pgcrypto's pgp_sym_encrypt) instead of a
-- one-way hash. This is a real security tradeoff versus the previous
-- design: if the database AND this function's source were both
-- compromised, the encryption key is recoverable. Flagged explicitly, not
-- hidden - it's an inherent consequence of the "view again" requirement,
-- not an implementation shortcut.
--
-- NOTE: the key below is a static string for this development phase, same
-- caveat as the HMAC pepper - move to a proper secret store before any
-- real deployment.

alter table public.security_recovery_codes
  add column code_encrypted bytea,
  add column one_time_view_allowed boolean not null default false,
  add column view_permission_granted_by uuid references public.administrator_accounts (id),
  add column view_permission_granted_at timestamptz;

-- code_hash (bcrypt) is superseded by code_encrypted for both verification
-- and reveal. Any existing rows only had test data (verified before this
-- migration - no real user currently has a code), so no backfill needed.
alter table public.security_recovery_codes drop column if exists code_hash;

create or replace function public.create_recovery_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(p_code);
begin
  if not public._is_valid_recovery_code_format(v_code) then
    raise exception 'Recovery code must contain exactly 2 letters and 4 digits';
  end if;

  if exists (select 1 from public.security_recovery_codes where user_id = auth.uid()) then
    raise exception 'A recovery code already exists for this account and cannot be regenerated';
  end if;

  begin
    insert into public.security_recovery_codes (user_id, code_encrypted, code_lookup_hash)
    values (
      auth.uid(),
      extensions.pgp_sym_encrypt(v_code, 'jojo-recovery-code-enc-key-v1-change-before-prod'),
      public._recovery_code_lookup_hash(v_code)
    );
  exception when unique_violation then
    raise exception 'DUPLICATE_CODE';
  end;

  insert into public.audit_logs (actor_user_id, action, entity_table)
  values (auth.uid(), 'security_recovery_code.created', 'security_recovery_codes');
end;
$$;

create or replace function public.verify_recovery_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_decrypted text;
begin
  select id, extensions.pgp_sym_decrypt(code_encrypted, 'jojo-recovery-code-enc-key-v1-change-before-prod')
    into v_id, v_decrypted
  from public.security_recovery_codes
  where user_id = auth.uid();

  if v_id is null or v_decrypted is distinct from upper(p_code) then
    return false;
  end if;

  update public.security_recovery_codes set used_at = now() where id = v_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_code.verified', 'security_recovery_codes', v_id);

  return true;
end;
$$;

-- Admin-side: grants the CALLER'S OWN user permission to view their code
-- once. Never reads code_encrypted - the admin only flips a boolean, so
-- there is no code path by which an admin can ever see the value.
create or replace function public.admin_grant_one_time_recovery_view(p_user_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.security_recovery_codes where user_id = p_user_id) then
    raise exception 'This user has no recovery code to grant a view of';
  end if;

  update public.security_recovery_codes
  set one_time_view_allowed = true,
      view_permission_granted_by = p_admin_id,
      view_permission_granted_at = now()
  where user_id = p_user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'security_recovery_code.one_time_view_granted', 'security_recovery_codes', p_user_id);

  insert into public.notifications (user_id, title, body, type)
  values (
    p_user_id,
    'Recovery Code view permission granted',
    'An administrator has granted you permission to view your Security Recovery Code one time. Open Security Recovery Code in Settings now.',
    'security'
  );
end;
$$;

-- Mobile-facing: reveals the code exactly once, then immediately revokes
-- the permission in the same transaction. Returns null if no grant exists.
create or replace function public.reveal_recovery_code_once()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  select id, extensions.pgp_sym_decrypt(code_encrypted, 'jojo-recovery-code-enc-key-v1-change-before-prod')
    into v_id, v_code
  from public.security_recovery_codes
  where user_id = auth.uid() and one_time_view_allowed = true
  for update;

  if v_id is null then
    return null;
  end if;

  update public.security_recovery_codes
  set one_time_view_allowed = false
  where id = v_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_code.viewed_once', 'security_recovery_codes', v_id);

  return v_code;
end;
$$;

-- Mobile needs to know whether a one-time view grant is currently active,
-- alongside the existing has_code flag.
drop view if exists public.security_recovery_codes_status;

create view public.security_recovery_codes_status as
select
  user_id,
  count(*) > 0 as has_code,
  bool_or(one_time_view_allowed) as can_view_once
from public.security_recovery_codes
where user_id = auth.uid()
group by user_id;

grant select on public.security_recovery_codes_status to authenticated;
