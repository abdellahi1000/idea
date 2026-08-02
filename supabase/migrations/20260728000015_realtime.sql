-- Realtime scope for phase 1: wallets (balance), transactions (own rows),
-- notifications (already added in 20260728000011_notifications.sql).

alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.transactions;
