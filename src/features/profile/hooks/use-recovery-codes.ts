import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { recoveryCodeRepository } from '@/repositories/recovery-code.repository';

export function useRecoveryCodeStatus() {
  const userId = useSessionStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ['recovery-code-status', userId],
    queryFn: () => recoveryCodeRepository.getStatus(userId as string),
    enabled: !!userId,
  });
}

export function useGenerateRecoveryCodeCandidate() {
  return useMutation({
    mutationFn: recoveryCodeRepository.generateCandidate,
  });
}

export function useCreateRecoveryCode() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => recoveryCodeRepository.create(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recovery-code-status', userId] }),
  });
}

export function useRevealRecoveryCodeOnce() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recoveryCodeRepository.revealOnce,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recovery-code-status', userId] }),
  });
}
