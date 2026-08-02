import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

export function useVerifyPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const { data, error } = await supabase.rpc('verify_login_pin', { p_pin: pin });
      if (error) throw error;
      return data ?? false;
    },
  });
}
