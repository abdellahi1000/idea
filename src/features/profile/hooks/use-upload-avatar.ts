import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { profileRepository } from '@/repositories/profile.repository';

export function useUploadAvatar() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (localUri: string) => profileRepository.uploadAvatar(userId as string, localUri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
