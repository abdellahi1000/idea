-- Self-service resolution: the user approves a transfer request from their
-- existing trusted device (p_approving_device_id must already be 'active'
-- and belong to them). Admin-mediated resolution is a future (Flask) phase
-- and will use a separate, service-role path - not this function.

create or replace function public.resolve_device_transfer_request(
  p_request_id uuid,
  p_approving_device_id uuid,
  p_approve boolean
)
returns public.device_transfer_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.device_transfer_requests;
begin
  select * into v_request
  from public.device_transfer_requests
  where id = p_request_id and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'No pending device transfer request found';
  end if;

  if not exists (
    select 1 from public.devices
    where id = p_approving_device_id and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Approving device must be one of your own active devices';
  end if;

  update public.device_transfer_requests
  set status = case when p_approve then 'approved' else 'denied' end,
      resolved_at = now()
  where id = p_request_id
  returning * into v_request;

  if p_approve then
    perform set_config('app.allow_device_activation', 'true', true);

    update public.devices set status = 'active', last_login_at = now()
    where id = v_request.to_device_id;

    update public.devices set status = 'transferred'
    where id = v_request.from_device_id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(), 'device_transfer_request.resolved', 'device_transfer_requests', p_request_id,
    jsonb_build_object('approved', p_approve)
  );

  return v_request;
end;
$$;
