-- Login PIN storage + verification. The PIN itself is never selectable by
-- the client (no RLS select policy exposes pin_hash - profiles_select_own
-- already restricts to the caller's own row, but the app must never select
-- this column directly; set/verify go through these RPCs only).

alter table public.profiles add column pin_hash text;

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

  update public.profiles
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where id = auth.uid();

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'profile.pin_set', 'profiles', auth.uid());
end;
$$;

create or replace function public.verify_login_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from public.profiles where id = auth.uid();

  if v_hash is null then
    return false;
  end if;

  return v_hash = extensions.crypt(p_pin, v_hash);
end;
$$;
