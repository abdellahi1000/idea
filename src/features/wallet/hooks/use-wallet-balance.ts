import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { walletService } from '@/services/wallet.service';

export function useWalletBalance() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallet', userId],
    queryFn: () => walletService.getOwnWallet(userId as string),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    return walletService.subscribeToOwnWallet(userId, (wallet) => {
      queryClient.setQueryData(['wallet', userId], wallet);
    });
  }, [userId, queryClient]);

  return query;
}
