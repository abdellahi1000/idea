-- Reinitialization requests are created by an admin on the user's behalf
-- after verifying physical presence at an agency - the mobile app never
-- offers a forgot/reset/regenerate path, so there is no client-facing
-- insert policy here at all.

create table public.recovery_code_reinitialization_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled', 'claimed')),
  requested_by uuid references public.administrator_accounts (id),
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.administrator_accounts (id),
  resolved_at timestamptz,
  claimed_at timestamptz
);

create index idx_recovery_code_reinit_user_id on public.recovery_code_reinitialization_requests (user_id);

alter table public.recovery_code_reinitialization_requests enable row level security;
alter table public.recovery_code_reinitialization_requests force row level security;

-- No policies for anon/authenticated. The admin dashboard manages this
-- table via the service role key. The mobile app's claim_reinitialized_
-- recovery_code() RPC (20260730000005) reads/updates the caller's own row
-- as SECURITY DEFINER, not via a client-facing policy, so the deny-all
-- here stays intact.
