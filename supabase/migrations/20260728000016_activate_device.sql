-- The only path that may set a device's status to 'active'. Sets the
-- transaction-local flag that guard_device_activation() (see
-- 20260728000005_devices.sql) checks before allowing the transition.

create or replace function public.activate_device(p_device_id uuid)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices;
begin
  if not exists (
    select 1 from public.devices
    where id = p_device_id and user_id = auth.uid()
  ) then
    raise exception 'Device does not belong to the authenticated user';
  end if;

  perform set_config('app.allow_device_activation', 'true', true);

  update public.devices
  set status = 'active', last_login_at = now()
  where id = p_device_id
  returning * into v_device;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'device.activated', 'devices', p_device_id);

  return v_device;
end;
$$;
