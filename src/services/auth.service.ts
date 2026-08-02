import { supabase } from '@/services/supabase/client';

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
