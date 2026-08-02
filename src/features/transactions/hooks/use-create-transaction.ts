import { useMutation, useQueryClient } from '@tanstack/react-query';

import { transactionService } from '@/services/transaction.service';

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionService.sendMoney,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
