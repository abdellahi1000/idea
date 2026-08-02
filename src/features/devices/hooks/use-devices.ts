import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { deviceService } from '@/services/device.service';

export function useDevices() {
  const userId = useSessionStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ['devices', userId],
    queryFn: () => deviceService.listOwnDevices(userId as string),
    enabled: !!userId,
  });
}

export function useRegisterCurrentDevice() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deviceService.registerCurrentDevice(userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices', userId] }),
  });
}
