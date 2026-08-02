import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

export function useResolveDeviceTransferRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { requestId: string; approvingDeviceId: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc('resolve_device_transfer_request', {
        p_request_id: args.requestId,
        p_approving_device_id: args.approvingDeviceId,
        p_approve: args.approve,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });
}
