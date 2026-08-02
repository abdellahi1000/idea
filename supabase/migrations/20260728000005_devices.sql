create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_installation_id text not null unique,
  device_name text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text,
  last_login_at timestamptz,
  status text not null default 'pending' check (status in ('active', 'pending', 'disabled', 'transferred')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_devices_user_id on public.devices (user_id);

create trigger set_devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

-- A device may only transition to 'active' via the activate_device() RPC
-- (see 20260728000013_activate_device.sql), never via a direct client update,
-- even though the row belongs to the user. The RPC sets a transaction-local
-- flag that this trigger checks.
create or replace function public.guard_device_activation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    if coalesce(current_setting('app.allow_device_activation', true), 'false') <> 'true' then
      raise exception 'Device activation must go through the activate_device() RPC';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_devices_activation
  before update on public.devices
  for each row execute function public.guard_device_activation();

alter table public.devices enable row level security;
alter table public.devices force row level security;

create policy "devices_select_own"
  on public.devices for select
  to authenticated
  using (user_id = auth.uid());

create policy "devices_insert_own"
  on public.devices for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "devices_update_own"
  on public.devices for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "devices_delete_own"
  on public.devices for delete
  to authenticated
  using (user_id = auth.uid());
