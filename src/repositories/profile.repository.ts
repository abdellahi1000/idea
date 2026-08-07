import { supabase } from '@/services/supabase/client';
import type { Profile } from '@/models/profile.model';
import type { TableUpdate } from '@/types/supabase.types';

// pin_hash and admin_notes must never reach the client, even unused in
// memory - select them explicitly by name rather than '*' so a future
// admin-only column doesn't silently leak here too.
const CLIENT_SAFE_COLUMNS =
  'id, full_name, phone, email, date_of_birth, profile_picture_path, role, status, biometric_enabled, approval_status, approval_rejection_reason, face_verification_failure_count, face_verification_locked_until, face_verification_disabled, face_identity_prompt_skipped, device_transfer_recovery_failure_count, device_transfer_recovery_locked_until, device_transfer_recovery_disabled, device_transfer_cooldown_until, created_at, updated_at';

export type ClientProfile = Omit<Profile, 'pin_hash' | 'admin_notes' | 'approved_at' | 'approved_by'>;

export const profileRepository = {
  async getOwn(userId: string): Promise<ClientProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select(CLIENT_SAFE_COLUMNS)
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async update(userId: string, patch: TableUpdate<'profiles'>): Promise<ClientProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select(CLIENT_SAFE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId: string, localUri: string): Promise<string> {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    await profileRepository.update(userId, { profile_picture_path: path });
    return path;
  },

  async getAvatarSignedUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl ?? null;
  },

  async hasLoginPin(): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_login_pin');
    if (error) throw error;
    return data ?? false;
  },
};
