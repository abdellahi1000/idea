-- Public "request access" submissions from the admin dashboard's login page.
-- These never create an account by themselves - a super_administrator must
-- review and explicitly approve each one, which is what actually creates
-- the Supabase Auth user + administrator_accounts row (see the Flask
-- app's request_access flow). No self-service admin signup exists anywhere.

create table public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.administrator_accounts (id),
  resolved_at timestamptz
);

create index idx_admin_access_requests_status on public.admin_access_requests (status);

alter table public.admin_access_requests enable row level security;
alter table public.admin_access_requests force row level security;

-- No policies for anon/authenticated at all - the public request-access
-- page and the admin review page both go through the Flask service-role
-- client, never a client-side Supabase call.
