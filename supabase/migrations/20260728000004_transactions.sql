create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_wallet_id uuid references public.wallets (id),
  recipient_wallet_id uuid references public.wallets (id),
  amount numeric(18, 2) not null check (amount > 0),
  currency_code text not null,
  type text not null check (type in ('transfer', 'deposit', 'withdrawal')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'reversed')),
  reference_note text,
  idempotency_key uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_sender on public.transactions (sender_wallet_id);
create index idx_transactions_recipient on public.transactions (recipient_wallet_id);
create index idx_transactions_created_at on public.transactions (created_at);
create unique index idx_transactions_idempotency_key
  on public.transactions (idempotency_key)
  where idempotency_key is not null;

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;
alter table public.transactions force row level security;

create policy "transactions_select_own"
  on public.transactions for select
  to authenticated
  using (
    exists (
      select 1 from public.wallets w
      where w.id in (sender_wallet_id, recipient_wallet_id)
        and w.user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for authenticated/anon: rows are created
-- and mutated only inside the create_transaction() RPC, which runs as the
-- table owner and bypasses RLS.
