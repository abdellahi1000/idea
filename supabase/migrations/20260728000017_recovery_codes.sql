-- Generates a fresh batch of 10 recovery codes for the caller, invalidating
-- any previous unused codes. Returns the plaintext codes exactly once - only
-- the pgcrypto hash is persisted. Client must display these immediately and
-- cannot retrieve them again afterwards.

create or replace function public.generate_recovery_codes()
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes text[] := '{}';
  v_code text;
  i int;
begin
  delete from public.security_recovery_codes
  where user_id = auth.uid() and used_at is null;

  for i in 1..10 loop
    -- 10-character alphanumeric code.
    v_code := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10));
    v_codes := array_append(v_codes, v_code);

    insert into public.security_recovery_codes (user_id, code_hash)
    values (auth.uid(), extensions.crypt(v_code, extensions.gen_salt('bf')));
  end loop;

  insert into public.audit_logs (actor_user_id, action, entity_table)
  values (auth.uid(), 'security_recovery_codes.generated', 'security_recovery_codes');

  return v_codes;
end;
$$;

-- Verifies a recovery code for the caller and marks it used (single-use).
-- Returns true if valid and previously unused, false otherwise. Never
-- reveals which codes exist or their hashes to the client.

create or replace function public.verify_recovery_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.security_recovery_codes
  where user_id = auth.uid()
    and used_at is null
    and code_hash = extensions.crypt(p_code, code_hash)
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.security_recovery_codes set used_at = now() where id = v_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_codes.used', 'security_recovery_codes', v_id);

  return true;
end;
$$;
