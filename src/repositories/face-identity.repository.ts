import { supabase } from '@/services/supabase/client';
import type { Tables } from '@/types/supabase.types';

type FaceIdentity = Tables<'face_identities'>;

export const faceIdentityRepository = {
  async getOwn(userId: string): Promise<FaceIdentity | null> {
    const { data, error } = await supabase
      .from('face_identities')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async uploadFirstFace(userId: string, localUri: string): Promise<string> {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/first-face-${Date.now()}.mp4`;

    const { error } = await supabase.storage
      .from('face-identity')
      .upload(path, arrayBuffer, { contentType: 'video/mp4' });
    if (error) throw error;
    return path;
  },

  async uploadLastFace(userId: string, localUri: string): Promise<string> {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/last-face-${Date.now()}.mp4`;

    const { error } = await supabase.storage
      .from('face-identity')
      .upload(path, arrayBuffer, { contentType: 'video/mp4' });
    if (error) throw error;
    return path;
  },

  async submitFirstFaceIdentity(storagePath: string): Promise<void> {
    const { error } = await supabase.rpc('submit_first_face_identity', { p_storage_path: storagePath });
    if (error) throw error;
  },
};
