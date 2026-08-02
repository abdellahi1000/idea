-- Phase 1's profiles_update_own policy is row-level only, so it technically
-- allowed a client to directly overwrite pin_hash/role/status via a plain
-- UPDATE, bypassing set_login_pin()'s hashing and any future role/status
-- controls. Close that gap: only full_name/phone/date_of_birth/
-- profile_picture_path/email/biometric_enabled may be changed directly by
-- the owner; pin_hash/role/status stay RPC- or admin-only.

create or replace function public.guard_profiles_restricted_columns()
returns trigger
language plpgsql
as $$
begin
  if (new.pin_hash is distinct from old.pin_hash
      or new.role is distinct from old.role
      or new.status is distinct from old.status)
     and coalesce(current_setting('app.allow_restricted_profile_write', true), 'false') <> 'true' then
    raise exception 'pin_hash/role/status cannot be changed directly; use the appropriate RPC';
  end if;
  return new;
end;
$$;

create trigger guard_profiles_restricted
  before update on public.profiles
  for each row execute function public.guard_profiles_restricted_columns();
