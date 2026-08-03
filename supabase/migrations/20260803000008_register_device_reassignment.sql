-- devices.device_installation_id is globally unique (not per-user), so a
-- plain client-side insert throws a duplicate-key error whenever the same
-- physical installation was previously bound to a different account (the
-- phone changed hands, app data was reset, or - during development - the
-- same emulator/simulator is reused across test accounts). This RPC
-- reassigns the row to the calling user instead of failing, resetting it
-- to 'pending' so the existing activate_device() RPC is still what turns
-- it active - and notifies whoever previously owned it.
--
-- Security note: user_id always comes from auth.uid(), never a client
-- parameter, so a caller can only ever claim an installation for their own
-- authenticated session - this cannot be used to reassign a row to an
-- arbitrary target account.
create or replace function public.register_device(
  p_device_installation_id text,
  p_device_name text,
  p_platform text
)
returns public.devices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_owner uuid;
  v_device public.devices;
begin
  if p_platform not in ('ios', 'android', 'web') then
    raise exception 'Invalid platform';
  end if;

  select user_id into v_previous_owner
  from public.devices
  where device_installation_id = p_device_installation_id;

  insert into public.devices (user_id, device_installation_id, device_name, platform, status)
  values (auth.uid(), p_device_installation_id, p_device_name, p_platform, 'pending')
  on conflict (device_installation_id) do update
    set user_id = excluded.user_id,
        device_name = excluded.device_name,
        platform = excluded.platform,
        status = 'pending'
  returning * into v_device;

  if v_previous_owner is not null and v_previous_owner <> auth.uid() then
    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
    values (
      auth.uid(), 'device.reassigned', 'devices', v_device.id,
      jsonb_build_object('previous_owner', v_previous_owner)
    );

    insert into public.notifications (user_id, title, body, type)
    values (
      v_previous_owner,
      'Device unlinked',
      'This device is now linked to a different JOJO account. If this wasn''t you, please contact support immediately.',
      'security'
    );
  end if;

  return v_device;
end;
$$;

grant execute on function public.register_device(text, text, text) to authenticated;
