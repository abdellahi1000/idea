create table public.device_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_device_id uuid references public.devices (id),
  to_device_id uuid references public.devices (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'expired')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_device_transfer_requests_user_id on public.device_transfer_requests (user_id);

alter table public.device_transfer_requests enable row level security;
alter table public.device_transfer_requests force row level security;

create policy "device_transfer_requests_select_own"
  on public.device_transfer_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy "device_transfer_requests_insert_own"
  on public.device_transfer_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Status transitions (approved/denied/expired) happen only via the
-- resolve_device_transfer_request() RPC, which runs as the table owner and
-- bypasses RLS - no update/delete policy is granted here.
