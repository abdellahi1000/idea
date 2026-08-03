-- Phone Number + Login PIN sign-in (verified server-side only) and an
-- admin-assisted Login PIN reset, mirroring admin_reset_recovery_code.

-- Looks a profile up by phone and checks its PIN. Deliberately NOT granted
-- to anon/authenticated - only callable via the service-role key, used
-- exclusively by the phone-pin-sign-in Edge Function, so the PIN can never
-- be checked directly from client code. Same generic error on every
-- failure path (unknown phone, no PIN set, wrong PIN) so this can never be
-- used to enumerate registered phone numbers.
create or replace function public.verify_phone_login_pin(p_phone text, p_pin text)
returns table (user_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  select id, email, pin_hash into v_profile
  from public.profiles
  where phone = p_phone;

  if v_profile.id is null or v_profile.pin_hash is null
     or v_profile.pin_hash <> extensions.crypt(p_pin, v_profile.pin_hash) then
    raise exception 'Invalid phone number or PIN';
  end if;

  return query select v_profile.id, v_profile.email;
end;
$$;

-- Clears the user's Login PIN without ever selecting/reading pin_hash - the
-- admin cannot see or recover the old PIN through this or any other path,
-- only remove it. The user is routed to /set-pin automatically on their
-- next sign-in (runAccessGate already checks has_login_pin()).
create or replace function public.admin_reset_login_pin(p_user_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set pin_hash = null where id = p_user_id;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id)
  values (p_admin_id, 'profile.pin_reset_by_admin', 'profiles', p_user_id);

  insert into public.notifications (user_id, title, body, type)
  values (
    p_user_id,
    'Login PIN reset',
    'Your Login PIN has been reset by an administrator. Sign in with your Email & Password to set a new one.',
    'security'
  );
end;
$$;
