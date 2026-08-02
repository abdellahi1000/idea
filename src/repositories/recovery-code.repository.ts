import { supabase } from '@/services/supabase/client';

export class DuplicateRecoveryCodeError extends Error {
  constructor() {
    super('This Recovery Code already exists. Please choose another one or generate a new Recovery Code.');
  }
}

export type RecoveryCodeStatus = {
  hasCode: boolean;
  canViewOnce: boolean;
};

export const recoveryCodeRepository = {
  async getStatus(userId: string): Promise<RecoveryCodeStatus> {
    const { data, error } = await supabase
      .from('security_recovery_codes_status')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return { hasCode: data?.has_code ?? false, canViewOnce: data?.can_view_once ?? false };
  },

  async checkAvailable(code: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_recovery_code_available', { p_code: code });
    if (error) throw error;
    return data ?? false;
  },

  async generateCandidate(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_recovery_code_candidate');
    if (error) throw error;
    return data;
  },

  /** Creates the user's one permanent recovery code. Throws
   * DuplicateRecoveryCodeError if the code is already taken (a race with
   * another user, since availability was already checked client-side). */
  async create(code: string): Promise<void> {
    const { error } = await supabase.rpc('create_recovery_code', { p_code: code });
    if (error) {
      if (error.message.includes('DUPLICATE_CODE')) {
        throw new DuplicateRecoveryCodeError();
      }
      throw error;
    }
  },

  async verify(code: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_recovery_code', { p_code: code });
    if (error) throw error;
    return data ?? false;
  },

  /** Reveals the code exactly once, only if an administrator has granted
   * permission - the permission is consumed atomically server-side.
   * Returns null if no grant is currently active. */
  async revealOnce(): Promise<string | null> {
    const { data, error } = await supabase.rpc('reveal_recovery_code_once');
    if (error) throw error;
    return data;
  },
};
