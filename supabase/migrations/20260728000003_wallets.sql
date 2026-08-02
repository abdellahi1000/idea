create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  balance numeric(18, 2) not null default 0 check (balance >= 0),
  currency_code text not null default 'USD',
  status text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, currency_code)
);

create index idx_wallets_user_id on public.wallets (user_id);

create trigger set_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;
alter table public.wallets force row level security;

create policy "wallets_select_own"
  on public.wallets for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies for authenticated/anon: rows are created by
-- handle_new_user() and balances are mutated only by the create_transaction()
-- RPC, both of which run as the table owner and bypass RLS.
