import { supabase } from '@/services/supabase/client';
import type { Tables } from '@/types/supabase.types';
import type { Json } from '@/types/database.types';

type DeviceTransferRequest = Tables<'device_transfer_requests'>;

export const deviceTransferRepository = {
  async start(args: {
    verificationMethod: 'qr_code' | 'face_id' | 'fingerprint';
    deviceInstallationId: string;
    deviceName: string;
    platform: 'ios' | 'android' | 'web';
  }): Promise<{ requestId: string; toDeviceId: string }> {
    const { data, error } = await supabase.rpc('start_device_transfer', {
      p_verification_method: args.verificationMethod,
      p_device_installation_id: args.deviceInstallationId,
      p_device_name: args.deviceName,
      p_platform: args.platform,
    });
    if (error) throw error;
    const row = data[0];
    return { requestId: row.request_id, toDeviceId: row.to_device_id };
  },

  async createQrCode(requestId: string): Promise<{ code: string; expiresAt: string }> {
    const { data, error } = await supabase.rpc('create_qr_transfer_code', { p_request_id: requestId });
    if (error) throw error;
    const row = data[0];
    return { code: row.code, expiresAt: row.expires_at };
  },

  async approveQrCode(code: string): Promise<void> {
    const { error } = await supabase.rpc('approve_qr_transfer', { p_code: code });
    if (error) throw error;
  },

  async submitFaceVerification(args: {
    requestId: string;
    storagePath: string;
    challenge: string[];
  }): Promise<string> {
    const { data, error } = await supabase.rpc('submit_face_verification_attempt', {
      p_request_id: args.requestId,
      p_storage_path: args.storagePath,
      p_challenge: args.challenge as unknown as Json,
    });
    if (error) throw error;
    return data;
  },

  async complete(requestId: string, recoveryCode: string): Promise<void> {
    const { error } = await supabase.rpc('complete_device_transfer', {
      p_request_id: requestId,
      p_recovery_code: recoveryCode,
    });
    if (error) throw error;
  },

  async getRequest(requestId: string): Promise<DeviceTransferRequest | null> {
    const { data, error } = await supabase
      .from('device_transfer_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  subscribeToRequest(requestId: string, onChange: (request: DeviceTransferRequest) => void) {
    const channel = supabase
      .channel(`device-transfer-${requestId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'device_transfer_requests', filter: `id=eq.${requestId}` },
        (payload) => onChange(payload.new as DeviceTransferRequest),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
