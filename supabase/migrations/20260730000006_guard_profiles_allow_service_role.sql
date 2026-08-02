-- The admin dashboard (service role) needs to change profiles.status
-- directly (suspend/activate/lock/unlock) without threading a config flag
-- through every call site. Extend the Phase 2 guard with the same
-- service_role bypass already used by guard_identity_verification_review_
-- columns, so only pin_hash stays flag-gated (still only ever written by
-- set_login_pin()) while status/role changes are allowed for service_role
-- callers (i.e. only the admin dashboard, never the mobile app's anon/
-- authenticated roles).

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

  return new;
end;
$$;
