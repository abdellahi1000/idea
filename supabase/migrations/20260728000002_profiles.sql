create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text unique,
  date_of_birth date,
  profile_picture_path text,
  role text not null default 'customer' check (role = 'customer'),
  status text not null default 'active' check (status in ('active', 'suspended', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_phone on public.profiles (phone);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policies for authenticated/anon: rows are created only by
-- handle_new_user() (see 20260728000012_handle_new_user.sql), which runs as
-- the table owner and bypasses RLS.
