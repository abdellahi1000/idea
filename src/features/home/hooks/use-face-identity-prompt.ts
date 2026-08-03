import { router } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { faceIdentityRepository } from '@/repositories/face-identity.repository';
import { settingsRepository, type PublicSettings } from '@/repositories/settings.repository';
import { supabase } from '@/services/supabase/client';

/** Shown once per Home mount (i.e. roughly once per app session, not on
 * every navigation) when the user is eligible: Face ID registration is
 * enabled, they don't already have one, and they haven't skipped before. */
export function useFaceIdentityPrompt() {
  const userId = useSessionStore((state) => state.session?.user.id);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const settings: PublicSettings = await settingsRepository.getPublicSettings().catch(() => ({}));
      if (settings.face_id_available === false) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('face_identity_prompt_skipped')
        .eq('id', userId)
        .single();
      if (profile?.face_identity_prompt_skipped) return;

      const existing = await faceIdentityRepository.getOwn(userId).catch(() => null);
      if (existing) return;

      router.push('/create-face-identity');
    })();
  }, [userId]);
}
