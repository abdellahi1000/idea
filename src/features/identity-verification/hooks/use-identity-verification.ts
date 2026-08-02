import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { identityVerificationService } from '@/services/identity-verification.service';

export function useIdentityVerification() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['identity-verification', userId],
    queryFn: () => identityVerificationService.getOwn(userId as string),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    return identityVerificationService.subscribeToOwn(userId, (record) => {
      queryClient.setQueryData(['identity-verification', userId], record);
    });
  }, [userId, queryClient]);

  return query;
}

export function useSubmitIdentityVerification() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      documentType: 'national_id' | 'passport' | 'drivers_license';
      documentNumber: string;
      documentFrontUri: string;
      documentBackUri?: string;
      selfieUri: string;
    }) => identityVerificationService.submitVerification({ ...input, userId: userId as string }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity-verification', userId] }),
  });
}
