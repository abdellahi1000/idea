-- Mobile-facing counterpart to the admin dashboard's reinitialization
-- approval (Security Recovery Code Management module). The admin can never
-- read the new code - it is only ever revealed to the user, exactly once,
-- when their own app claims it here.

create or replace function public.claim_reinitialized_recovery_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_code text;
begin
  select id into v_request_id
  from public.recovery_code_reinitialization_requests
  where user_id = auth.uid() and status = 'approved'
  order by resolved_at desc
  limit 1;

  if v_request_id is null then
    return null;
  end if;

  delete from public.security_recovery_codes where user_id = auth.uid();

  v_code := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.security_recovery_codes (user_id, code_hash)
  values (auth.uid(), extensions.crypt(v_code, extensions.gen_salt('bf')));

  update public.recovery_code_reinitialization_requests
  set status = 'claimed', claimed_at = now()
  where id = v_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_code.reinitialized_and_claimed', 'security_recovery_codes', v_request_id);

  return v_code;
end;
$$;
