-- Redefines set_login_pin() to set the transaction-local flag that
-- guard_profiles_restricted_columns() (20260729000002) requires before it
-- will allow a pin_hash write, since that guard now applies to every UPDATE
-- on profiles regardless of caller.

create or replace function public.set_login_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4-6 digits';
  end if;

  perform set_config('app.allow_restricted_profile_write', 'true', true);

  update public.profiles
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where id = auth.uid();

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'profile.pin_set', 'profiles', auth.uid());
end;
$$;
