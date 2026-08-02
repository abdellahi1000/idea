-- Simplifies the admin-side recovery code reset to a single, immediate
-- action: no request/approve two-step, no auto-generated replacement code
-- shown on the user's device. The admin just deletes the existing code;
-- the user creates their own new one from the normal Security Recovery
-- Code screen next time they open it (it already renders the creation form
-- whenever no code exists - no mobile-side change needed for that part).

drop function if exists public.claim_reinitialized_recovery_code();
drop table if exists public.recovery_code_reinitialization_requests;

-- Deletes the user's recovery code without ever selecting/reading
-- code_hash - the admin cannot see or recover the old code through this or
-- any other path, only remove it.
create or replace function public.admin_reset_recovery_code(p_user_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.security_recovery_codes where user_id = p_user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'security_recovery_code.reset_by_admin', 'security_recovery_codes', p_user_id);

  insert into public.notifications (user_id, title, body, type)
  values (
    p_user_id,
    'Security Recovery Code reset',
    'Your Security Recovery Code has been reset by an administrator. Open Security Recovery Code in Settings to create a new one.',
    'security'
  );
end;
$$;
