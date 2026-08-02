import { useQuery } from '@tanstack/react-query';

import { transactionRepository } from '@/repositories/transaction.repository';

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionRepository.getById(id as string),
    enabled: !!id,
  });
}
