-- Admin dashboard: "locked" is distinct from suspended/disabled and needs
-- its own history (reason, who locked/unlocked, when).

alter table public.profiles drop constraint profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('active', 'suspended', 'disabled', 'locked'));

create table public.account_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'incorrect_recovery_code', 'too_many_attempts', 'suspicious_activity', 'manual'
  )),
  locked_at timestamptz not null default now(),
  locked_by uuid references public.administrator_accounts (id),
  unlocked_at timestamptz,
  unlocked_by uuid references public.administrator_accounts (id)
);

create index idx_account_locks_user_id on public.account_locks (user_id);

alter table public.account_locks enable row level security;
alter table public.account_locks force row level security;

-- Admin-only: no policies for anon/authenticated, same pattern as
-- administrator_accounts. The Flask dashboard uses the service role key,
-- which bypasses RLS entirely.
