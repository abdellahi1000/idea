import { useQuery } from '@tanstack/react-query';

import { transactionRepository } from '@/repositories/transaction.repository';

const RECENT_COUNT = 5;

export function useRecentTransactions(walletId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', walletId, 'recent'],
    queryFn: async () => {
      const page = await transactionRepository.listPage(walletId as string);
      return page.items.slice(0, RECENT_COUNT);
    },
    enabled: !!walletId,
  });
}
