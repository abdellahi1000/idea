import { supabase } from '@/services/supabase/client';
import type { Device } from '@/models/device.model';
import type { TableInsert } from '@/types/supabase.types';

export const deviceRepository = {
  async listOwn(userId: string): Promise<Device[]> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_login_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async register(input: TableInsert<'devices'>): Promise<Device> {
    const { data, error } = await supabase.from('devices').insert(input).select('*').single();
    if (error) throw error;
    return data;
  },

  async activate(deviceId: string): Promise<Device> {
    const { data, error } = await supabase.rpc('activate_device', { p_device_id: deviceId });
    if (error) throw error;
    return data;
  },
};
