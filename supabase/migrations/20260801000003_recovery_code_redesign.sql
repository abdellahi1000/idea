-- Full redesign of the recovery code: was a 10-char random alphanumeric
-- string generated silently at signup; is now a user-typed-or-generated
-- 6-char code (exactly 2 letters + 4 digits, any order) that the user
-- actively creates from Settings and must be globally unique.
--
-- Global uniqueness can't be checked directly against a bcrypt hash (each
-- hash is independently salted), so a second, deterministic "blind index"
-- column (HMAC-SHA256 with a server-side pepper) is added purely for fast,
-- safe uniqueness lookups. The actual verification hash stays bcrypt via
-- pgcrypto, exactly as before. Never store the plaintext code anywhere.

alter table public.security_recovery_codes
  add column code_lookup_hash text,
  add column updated_at timestamptz not null default now();

create unique index idx_security_recovery_codes_lookup_hash
  on public.security_recovery_codes (code_lookup_hash);

create trigger set_security_recovery_codes_updated_at
  before update on public.security_recovery_codes
  for each row execute function public.set_updated_at();

-- NOTE: the pepper below is a static string for this development phase.
-- Before any real deployment, move it to a proper secret (e.g. Supabase
-- Vault / a GUC set from an Edge Function secret) rather than embedding it
-- in function source.
create or replace function public._recovery_code_lookup_hash(p_code text)
returns text
language sql
immutable
as $$
  select encode(
    extensions.hmac(upper(p_code), 'jojo-recovery-code-pepper-v1-change-before-prod', 'sha256'),
    'hex'
  );
$$;

create or replace function public._is_valid_recovery_code_format(p_code text)
returns boolean
language sql
immutable
as $$
  select p_code ~ '^[A-Z0-9]{6}$'
     and length(regexp_replace(p_code, '[^A-Z]', '', 'g')) = 2
     and length(regexp_replace(p_code, '[^0-9]', '', 'g')) = 4;
$$;

create or replace function public.check_recovery_code_available(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._is_valid_recovery_code_format(upper(p_code)) then
    return false;
  end if;

  return not exists (
    select 1 from public.security_recovery_codes
    where code_lookup_hash = public._recovery_code_lookup_hash(p_code)
  );
end;
$$;

create or replace function public.generate_recovery_code_candidate()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_letters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  v_digits text := '0123456789';
  v_chars text[];
  v_letter_positions int[];
  v_code text;
  i int;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    if attempt > 50 then
      raise exception 'Unable to generate a unique recovery code right now. Please try again.';
    end if;

    v_letter_positions := array(select x from generate_series(0, 5) as x order by random() limit 2);
    v_chars := array['', '', '', '', '', ''];
    for i in 1..6 loop
      v_chars[i] := substr(v_digits, (floor(random() * 10) + 1)::int, 1);
    end loop;
    v_chars[v_letter_positions[1] + 1] := substr(v_letters, (floor(random() * 26) + 1)::int, 1);
    v_chars[v_letter_positions[2] + 1] := substr(v_letters, (floor(random() * 26) + 1)::int, 1);
    v_code := array_to_string(v_chars, '');

    exit when public.check_recovery_code_available(v_code);
  end loop;

  return v_code;
end;
$$;

-- Replaces initialize_recovery_code(): the user now actively supplies the
-- code (typed or from generate_recovery_code_candidate()) and confirms it,
-- rather than one being generated silently for them.
drop function if exists public.initialize_recovery_code();

create or replace function public.create_recovery_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(p_code);
begin
  if not public._is_valid_recovery_code_format(v_code) then
    raise exception 'Recovery code must contain exactly 2 letters and 4 digits';
  end if;

  if exists (select 1 from public.security_recovery_codes where user_id = auth.uid()) then
    raise exception 'A recovery code already exists for this account and cannot be regenerated';
  end if;

  begin
    insert into public.security_recovery_codes (user_id, code_hash, code_lookup_hash)
    values (
      auth.uid(),
      extensions.crypt(v_code, extensions.gen_salt('bf')),
      public._recovery_code_lookup_hash(v_code)
    );
  exception when unique_violation then
    raise exception 'DUPLICATE_CODE';
  end;

  insert into public.audit_logs (actor_user_id, action, entity_table)
  values (auth.uid(), 'security_recovery_code.created', 'security_recovery_codes');
end;
$$;

-- The admin-approved reinitialization path also needs to produce a code in
-- the new format now.
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

  v_code := public.generate_recovery_code_candidate();

  insert into public.security_recovery_codes (user_id, code_hash, code_lookup_hash)
  values (
    auth.uid(),
    extensions.crypt(v_code, extensions.gen_salt('bf')),
    public._recovery_code_lookup_hash(v_code)
  );

  update public.recovery_code_reinitialization_requests
  set status = 'claimed', claimed_at = now()
  where id = v_request_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_code.reinitialized_and_claimed', 'security_recovery_codes', v_request_id);

  return v_code;
end;
$$;
