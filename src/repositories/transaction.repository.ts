import { supabase } from '@/services/supabase/client';
import type { Transaction } from '@/models/transaction.model';
import type { Tables } from '@/types/supabase.types';

const PAGE_SIZE = 20;

export const transactionRepository = {
  async listPage(walletId: string, cursor?: string): Promise<{ items: Transaction[]; nextCursor?: string }> {
    let query = supabase
      .from('transactions_with_counterparty')
      .select('*')
      .or(`sender_wallet_id.eq.${walletId},recipient_wallet_id.eq.${walletId}`)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    const nextCursor = items.length === PAGE_SIZE ? items[items.length - 1].created_at : undefined;
    return { items, nextCursor };
  },

  async getById(id: string): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions_with_counterparty')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(args: {
    senderWalletId: string;
    recipientPhone: string;
    amount: number;
    idempotencyKey: string;
    note?: string;
  }): Promise<Tables<'transactions'>> {
    const { data, error } = await supabase.rpc('create_transaction', {
      p_sender_wallet_id: args.senderWalletId,
      p_recipient_phone: args.recipientPhone,
      p_amount: args.amount,
      p_idempotency_key: args.idempotencyKey,
      p_note: args.note ?? null,
    });
    if (error) throw error;
    return data;
  },
};
