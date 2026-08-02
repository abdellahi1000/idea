import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { profileRepository } from '@/repositories/profile.repository';

export function useProfile() {
  const userId = useSessionStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileRepository.getOwn(userId as string),
    enabled: !!userId,
  });
}
