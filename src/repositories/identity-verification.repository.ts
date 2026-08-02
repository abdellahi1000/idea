import { supabase } from '@/services/supabase/client';
import type { Tables, TableInsert } from '@/types/supabase.types';

type IdentityVerification = Tables<'identity_verification'>;

const BUCKET = 'identity-documents';

// See the matching comment in wallet.repository.ts: channel names must be
// unique per subscription, not just per user, since multiple screens can be
// mounted (and subscribed) at the same time.
let channelSequence = 0;

async function uploadImage(userId: string, kind: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${userId}/${kind}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
  if (error) throw error;

  return path;
}

export const identityVerificationRepository = {
  async getOwn(userId: string): Promise<IdentityVerification | null> {
    const { data, error } = await supabase
      .from('identity_verification')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  uploadDocumentFront: (userId: string, localUri: string) => uploadImage(userId, 'document-front', localUri),
  uploadDocumentBack: (userId: string, localUri: string) => uploadImage(userId, 'document-back', localUri),
  uploadSelfie: (userId: string, localUri: string) => uploadImage(userId, 'selfie', localUri),

  async submit(input: TableInsert<'identity_verification'>): Promise<IdentityVerification> {
    const { data, error } = await supabase
      .from('identity_verification')
      .insert(input)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async requestVerification(identityVerificationId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('verify-identity', {
      body: { identity_verification_id: identityVerificationId },
    });
    if (error) throw error;
  },

  subscribeToOwn(userId: string, onChange: (record: IdentityVerification) => void) {
    const channel = supabase
      .channel(`identity-verification-${userId}-${channelSequence++}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'identity_verification',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onChange(payload.new as IdentityVerification),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
