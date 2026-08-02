create table public.security_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_security_recovery_codes_user_id on public.security_recovery_codes (user_id);

alter table public.security_recovery_codes enable row level security;
alter table public.security_recovery_codes force row level security;

-- No policies for authenticated/anon: raw rows (and hashes) are never
-- readable from the client. generate_recovery_codes() and verify_recovery_code()
-- (see later migrations) run as the table owner and bypass RLS.

-- Non-sensitive status view: how many unused codes remain, nothing else.
-- Intentionally NOT security_invoker: it runs as the view owner so it can
-- read the RLS-locked base table, but the auth.uid() filter below still
-- scopes each caller to only their own row.
create view public.security_recovery_codes_status as
select
  user_id,
  count(*) filter (where used_at is null) as unused_count,
  count(*) as total_count
from public.security_recovery_codes
where user_id = auth.uid()
group by user_id;

grant select on public.security_recovery_codes_status to authenticated;
