import { supabase } from '@/services/supabase/client';

export type PublicSettings = {
  face_id_available?: boolean;
  fingerprint_available?: boolean;
  qr_code_available?: boolean;
  min_transfer_amount?: number;
  max_transfer_amount?: number;
  new_device_activation_delay_minutes?: number;
};

export const settingsRepository = {
  async getPublicSettings(): Promise<PublicSettings> {
    const { data, error } = await supabase.rpc('get_public_settings');
    if (error) throw error;
    return (data as PublicSettings) ?? {};
  },
};
