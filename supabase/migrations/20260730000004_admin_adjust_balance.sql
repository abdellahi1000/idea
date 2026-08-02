-- Atomic, audited balance adjustment for the admin dashboard. Always called
-- with the service-role key (Flask never uses the anon key), so RLS is
-- already bypassed; SECURITY DEFINER + explicit search_path are kept for
-- consistency with every other privileged function in this schema.

create or replace function public.admin_adjust_balance(
  p_wallet_id uuid,
  p_amount_delta numeric,
  p_reason text,
  p_admin_id uuid
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for every balance adjustment';
  end if;

  select * into v_wallet from public.wallets where id = p_wallet_id for update;
  if not found then
    raise exception 'Wallet not found';
  end if;

  if v_wallet.balance + p_amount_delta < 0 then
    raise exception 'Adjustment would result in a negative balance';
  end if;

  update public.wallets
  set balance = balance + p_amount_delta
  where id = p_wallet_id
  returning * into v_wallet;

  insert into public.audit_logs (actor_admin_id, action, entity_table, entity_id, metadata)
  values (
    p_admin_id, 'wallet.balance_adjusted', 'wallets', p_wallet_id,
    jsonb_build_object('amount_delta', p_amount_delta, 'reason', p_reason, 'new_balance', v_wallet.balance)
  );

  return v_wallet;
end;
$$;
