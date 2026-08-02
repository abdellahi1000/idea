import { supabase } from '@/services/supabase/client';
import type { Wallet } from '@/models/wallet.model';

// Realtime channels are deduplicated by name in the Supabase client. Home
// and Transactions can both be mounted at once (tab navigators keep screens
// alive), so a name built only from userId would collide - a second
// .channel() call returns the already-subscribed instance, and calling
// .on() on it throws "Cannot add postgres_changes callbacks ... after
// subscribe()". A per-call counter keeps every subscription's channel unique.
let channelSequence = 0;

export const walletRepository = {
  async getOwn(userId: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  subscribeToOwn(userId: string, onChange: (wallet: Wallet) => void) {
    const channel = supabase
      .channel(`wallet-${userId}-${channelSequence++}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
        (payload) => onChange(payload.new as Wallet),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
