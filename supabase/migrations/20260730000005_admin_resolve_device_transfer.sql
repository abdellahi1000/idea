-- Admin-side device transfer approval. Distinct from the mobile app's own
-- resolve_device_transfer_request() (Phase 1) which lets a user approve
-- from an existing trusted device - this is the agency/admin path, and per
-- the doc a transfer must never auto-approve, so this is always an explicit
-- admin action from the dashboard.

create or replace function public.admin_resolve_device_transfer(
  p_request_id uuid,
  p_admin_id uuid,
  p_approve boolean,
  p_reason text default null
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
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'No pending device transfer request found';
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

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id, metadata)
  values (
    p_admin_id, 'device_transfer_request.admin_resolved', 'device_transfer_requests', p_request_id,
    jsonb_build_object('approved', p_approve, 'reason', p_reason)
  );

  return v_request;
end;
$$;
