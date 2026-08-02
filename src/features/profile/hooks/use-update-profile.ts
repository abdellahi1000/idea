import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { profileRepository } from '@/repositories/profile.repository';
import type { TableUpdate } from '@/types/supabase.types';

export function useUpdateProfile() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: TableUpdate<'profiles'>) => profileRepository.update(userId as string, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}
