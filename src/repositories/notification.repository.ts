import { supabase } from '@/services/supabase/client';
import type { Tables } from '@/types/supabase.types';

type Notification = Tables<'notifications'>;

// See the matching comment in wallet.repository.ts: channel names must be
// unique per subscription, not just per user, since multiple screens can be
// mounted (and subscribed) at the same time.
let channelSequence = 0;

export const notificationRepository = {
  async listOwn(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async markRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;
  },

  subscribeToOwn(userId: string, onInsert: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications-${userId}-${channelSequence++}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => onInsert(payload.new as Notification),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
