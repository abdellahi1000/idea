import { useEffect } from 'react';

import { runAccessGate } from '@/features/auth/utilities/run-access-gate';
import { useSessionStore } from '@/features/auth/hooks/use-session';

/**
 * Defense in depth: re-checks approval status and PIN setup once on Home
 * mount, in case an already-open session's account gets rejected/locked (or
 * somehow reached Home without a PIN) while the app is running. The primary
 * enforcement happens at sign-in via runAccessGate() directly.
 */
export function useAccessGateCheck() {
  const userId = useSessionStore((state) => state.session?.user.id);

  useEffect(() => {
    if (!userId) return;
    runAccessGate(userId).catch(() => {
      // Non-fatal: leave the user on Home rather than blocking on a
      // transient network error during this defensive re-check.
    });
  }, [userId]);
}
