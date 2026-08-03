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

  async findByInstallationId(userId: string, deviceInstallationId: string): Promise<Device | null> {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_installation_id', deviceInstallationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async hasActiveDevice(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async register(input: TableInsert<'devices'>): Promise<Device> {
    // device_installation_id is globally unique, not per-user - a plain
    // insert() throws a duplicate-key error whenever the same physical
    // installation was previously bound to a different account (e.g. the
    // phone/emulator changed hands, or app data was reset). Reassigning
    // ownership can't safely happen via a client-side upsert - the
    // devices_update_own RLS policy only allows updating rows the caller
    // already owns, and even if it didn't, the client shouldn't be trusted
    // to reassign an arbitrary row by ID collision. register_device() does
    // this server-side instead: it always attributes the new row to
    // auth.uid() (never a client-supplied value), resets it to 'pending',
    // and notifies the previous owner if the installation was reassigned.
    const { data, error } = await supabase.rpc('register_device', {
      p_device_installation_id: input.device_installation_id,
      p_device_name: input.device_name,
      p_platform: input.platform,
    });
    if (error) throw error;
    return data;
  },

  async activate(deviceId: string): Promise<Device> {
    const { data, error } = await supabase.rpc('activate_device', { p_device_id: deviceId });
    if (error) throw error;
    return data;
  },
};
