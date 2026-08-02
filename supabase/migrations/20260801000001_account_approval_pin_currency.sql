-- Account approval workflow: every new signup starts 'pending' and cannot
-- sign in until an administrator approves them from the dashboard.

alter table public.profiles
  add column approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column approval_rejection_reason text,
  add column approved_at timestamptz,
  add column approved_by uuid references public.administrator_accounts (id);

-- Extend the Phase 2/3 guard: approval fields are admin-only (service_role),
-- same bypass pattern already used for role/status.
create or replace function public.guard_profiles_restricted_columns()
returns trigger
language plpgsql
as $$
begin
  if new.pin_hash is distinct from old.pin_hash
     and coalesce(current_setting('app.allow_restricted_profile_write', true), 'false') <> 'true' then
    raise exception 'pin_hash cannot be changed directly; use set_login_pin()';
  end if;

  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.role() <> 'service_role' then
    raise exception 'role/status cannot be changed directly by the mobile app';
  end if;

  if (new.approval_status is distinct from old.approval_status
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.approval_rejection_reason is distinct from old.approval_rejection_reason)
     and auth.role() <> 'service_role' then
    raise exception 'approval fields can only be changed by an administrator';
  end if;

  return new;
end;
$$;

-- The mobile app needs to know whether a PIN exists without ever being able
-- to select pin_hash itself.
create or replace function public.has_login_pin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select pin_hash is not null from public.profiles where id = auth.uid();
$$;

-- Client_App.docx: PIN must be exactly 4 or 6 digits, not any length 4-6.
create or replace function public.set_login_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin !~ '^([0-9]{4}|[0-9]{6})$' then
    raise exception 'PIN must be exactly 4 or 6 digits';
  end if;

  perform set_config('app.allow_restricted_profile_write', 'true', true);

  update public.profiles
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where id = auth.uid();

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id)
  values (auth.uid(), 'profile.pin_set', 'profiles', auth.uid());
end;
$$;

-- Mauritanian Ouguiya (MRU), not USD, per Client_App.docx.
alter table public.wallets alter column currency_code set default 'MRU';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  insert into public.wallets (user_id, currency_code)
  values (new.id, 'MRU');

  return new;
end;
$$;
