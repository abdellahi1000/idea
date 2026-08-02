import { useInfiniteQuery } from '@tanstack/react-query';

import { transactionService } from '@/services/transaction.service';

export function useTransactionHistory(walletId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['transactions', walletId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      transactionService.listPage(walletId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!walletId,
  });
}
