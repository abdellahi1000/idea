import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase/client';

// supabase.functions.invoke() only reports "Edge Function returned a
// non-2xx status code" on failure - the actual { error: '...' } body the
// function sent back is left unread on error.context (a Response). Pull
// the real message out so failures are legible instead of generic.
async function describeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const response: Response = error.context;
    try {
      const body = await response.json();
      // Our own functions send { error: '...' }; Supabase's platform-level
      // failures (e.g. function not deployed) send { message: '...' } instead.
      if (typeof body?.error === 'string') return body.error;
      if (typeof body?.message === 'string') return body.message;
    } catch {
      // Body wasn't JSON - fall through below.
    }
    return `Sign-in service returned an error (status ${response.status}).`;
  }
  return error instanceof Error ? error.message : 'Please try again.';
}

export const authService = {
  async signUp(params: { email: string; password: string; fullName: string; phone: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: { full_name: params.fullName, phone: params.phone },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(params);
    if (error) throw error;
    return data;
  },

  async signInWithPhonePin(params: { phone: string; pin: string }) {
    const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('phone-pin-sign-in', {
      body: params,
    });
    if (error) throw new Error(await describeFunctionError(error));
    if (!data) throw new Error('Invalid phone number or PIN');

    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    });
    if (verifyError) throw verifyError;
    return verified;
  },

  async resetPassword(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async exchangeCodeForSession(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
