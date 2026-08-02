-- Enriches transactions with a display-friendly direction + counterparty
-- name for the Transactions list/detail screens, avoiding N+1 client-side
-- profile lookups per row.
--
-- Intentionally NOT security_invoker: profiles RLS only allows selecting
-- your own row, which would null out the counterparty's name if the view
-- ran as the caller. Instead this view runs as its owner (bypassing
-- profiles/wallets RLS for the join) but replicates transactions' own RLS
-- condition in its WHERE clause, so callers still only ever see their own
-- transactions - same pattern as security_recovery_codes_status.
create view public.transactions_with_counterparty as
select
  t.id,
  t.sender_wallet_id,
  t.recipient_wallet_id,
  t.amount,
  t.currency_code,
  t.type,
  t.status,
  t.reference_note,
  t.idempotency_key,
  t.created_at,
  t.updated_at,
  case when sw.user_id = auth.uid() then 'sent' else 'received' end as direction,
  case when sw.user_id = auth.uid() then rp.full_name else sp.full_name end as counterparty_name
from public.transactions t
left join public.wallets sw on sw.id = t.sender_wallet_id
left join public.wallets rw on rw.id = t.recipient_wallet_id
left join public.profiles sp on sp.id = sw.user_id
left join public.profiles rp on rp.id = rw.user_id
where sw.user_id = auth.uid() or rw.user_id = auth.uid();

grant select on public.transactions_with_counterparty to authenticated;
