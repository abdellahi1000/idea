-- Schema-complete placeholder for the future Flask admin dashboard phase.
-- Fully inaccessible to the mobile app: RLS is enabled with zero policies
-- granted to anon/authenticated, so no client role can select/insert/update/
-- delete regardless of row ownership. Only a future service-role context
-- (the Flask backend, using the service_role key) will be able to touch it.

create table public.administrator_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('administrator', 'super_administrator')),
  status text not null default 'active' check (status in ('active', 'suspended', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_administrator_accounts_updated_at
  before update on public.administrator_accounts
  for each row execute function public.set_updated_at();

alter table public.administrator_accounts enable row level security;
alter table public.administrator_accounts force row level security;

-- Intentionally no policies for anon/authenticated.
