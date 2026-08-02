-- Client_App.docx: the Security Recovery Code is singular, permanent,
-- created once at signup, and can never be regenerated/reset from the app.
-- Phase 1 built a 10-code regenerable model; this migration replaces it.

-- At most one recovery code row per user, ever.
create unique index idx_one_recovery_code_per_user on public.security_recovery_codes (user_id);

drop function if exists public.generate_recovery_codes();

-- Generates the single permanent code. Raises if the user already has one -
-- this is the database-level enforcement of "cannot be regenerated", not
-- just a UI restriction.
create or replace function public.initialize_recovery_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if exists (select 1 from public.security_recovery_codes where user_id = auth.uid()) then
    raise exception 'A recovery code already exists for this account and cannot be regenerated';
  end if;

  v_code := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.security_recovery_codes (user_id, code_hash)
  values (auth.uid(), extensions.crypt(v_code, extensions.gen_salt('bf')));

  insert into public.audit_logs (actor_user_id, action, entity_table)
  values (auth.uid(), 'security_recovery_code.initialized', 'security_recovery_codes');

  return v_code;
end;
$$;

-- The code is permanent, not single-use: verifying it no longer requires
-- used_at to be null, and used_at now records "last used" rather than
-- "consumed".
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
    and code_hash = extensions.crypt(p_code, code_hash)
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.security_recovery_codes set used_at = now() where id = v_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'security_recovery_code.verified', 'security_recovery_codes', v_id);

  return true;
end;
$$;

-- The status view's "unused_count"/"total_count" columns no longer mean
-- anything for a single permanent code. CREATE OR REPLACE VIEW cannot drop
-- columns, so the view is dropped and recreated with the new shape.
drop view if exists public.security_recovery_codes_status;

create view public.security_recovery_codes_status as
select
  user_id,
  count(*) > 0 as has_code
from public.security_recovery_codes
where user_id = auth.uid()
group by user_id;

grant select on public.security_recovery_codes_status to authenticated;
