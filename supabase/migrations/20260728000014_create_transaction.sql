-- Atomic money transfer. Mobile calls this exclusively via
-- supabase.rpc('create_transaction', {...}); RLS blocks any direct client
-- write to wallets/transactions regardless, so this is the only path.
--
-- search_path is pinned explicitly (defense against search_path hijacking)
-- and only to schemas this function actually needs.

create or replace function public.create_transaction(
  p_sender_wallet_id uuid,
  p_recipient_phone text,
  p_amount numeric,
  p_idempotency_key uuid,
  p_note text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_wallet public.wallets;
  v_recipient_wallet public.wallets;
  v_transaction public.transactions;
  v_first_wallet_id uuid;
  v_second_wallet_id uuid;
begin
  -- 1. Defense in depth: RLS already prevents selecting a wallet that isn't
  -- the caller's, but re-check explicitly since this function runs as owner.
  if not exists (
    select 1 from public.wallets
    where id = p_sender_wallet_id and user_id = auth.uid()
  ) then
    raise exception 'Sender wallet does not belong to the authenticated user';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  -- Idempotency: a retried request with the same key returns the original
  -- result instead of erroring or double-spending.
  select * into v_transaction
  from public.transactions
  where idempotency_key = p_idempotency_key;

  if found then
    return v_transaction;
  end if;

  -- 2. Resolve recipient wallet by phone number.
  select w.* into v_recipient_wallet
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where p.phone = p_recipient_phone
  limit 1;

  if not found then
    raise exception 'No account found for recipient phone number';
  end if;

  if v_recipient_wallet.id = p_sender_wallet_id then
    raise exception 'Cannot send money to your own wallet';
  end if;

  -- 3. Lock both wallets in a fixed order (by id) to avoid deadlocks between
  -- concurrent transfers that touch the same pair of wallets in either
  -- direction.
  if p_sender_wallet_id < v_recipient_wallet.id then
    v_first_wallet_id := p_sender_wallet_id;
    v_second_wallet_id := v_recipient_wallet.id;
  else
    v_first_wallet_id := v_recipient_wallet.id;
    v_second_wallet_id := p_sender_wallet_id;
  end if;

  perform 1 from public.wallets where id = v_first_wallet_id for update;
  perform 1 from public.wallets where id = v_second_wallet_id for update;

  select * into v_sender_wallet from public.wallets where id = p_sender_wallet_id;
  select * into v_recipient_wallet from public.wallets where id = v_recipient_wallet.id;

  -- 4. Validate.
  if v_sender_wallet.status <> 'active' then
    raise exception 'Sender wallet is not active';
  end if;

  if v_recipient_wallet.status <> 'active' then
    raise exception 'Recipient wallet is not active';
  end if;

  if v_sender_wallet.currency_code <> v_recipient_wallet.currency_code then
    raise exception 'Currency mismatch between sender and recipient wallets';
  end if;

  if v_sender_wallet.balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  -- 5. Insert the transaction row.
  insert into public.transactions (
    sender_wallet_id, recipient_wallet_id, amount, currency_code,
    type, status, reference_note, idempotency_key
  ) values (
    p_sender_wallet_id, v_recipient_wallet.id, p_amount, v_sender_wallet.currency_code,
    'transfer', 'completed', p_note, p_idempotency_key
  )
  returning * into v_transaction;

  -- 6. Update balances.
  update public.wallets set balance = balance - p_amount where id = p_sender_wallet_id;
  update public.wallets set balance = balance + p_amount where id = v_recipient_wallet.id;

  -- 7. Audit log.
  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(), 'transaction.created', 'transactions', v_transaction.id,
    jsonb_build_object('amount', p_amount, 'currency_code', v_sender_wallet.currency_code)
  );

  -- 8. Notifications for both parties.
  insert into public.notifications (user_id, title, body, type, metadata)
  values
    (v_sender_wallet.user_id, 'Money sent', format('You sent %s %s', p_amount, v_sender_wallet.currency_code),
     'transaction', jsonb_build_object('transaction_id', v_transaction.id)),
    (v_recipient_wallet.user_id, 'Money received', format('You received %s %s', p_amount, v_sender_wallet.currency_code),
     'transaction', jsonb_build_object('transaction_id', v_transaction.id));

  -- 9. Realtime propagates the wallet/transaction/notification changes above
  -- automatically (those tables are added to supabase_realtime).
  return v_transaction;
end;
$$;
