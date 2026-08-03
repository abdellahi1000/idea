import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { authService } from '@/services/auth.service';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  setSession: (session: Session | null) => void;
  setIsPasswordRecovery: (isPasswordRecovery: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  isPasswordRecovery: false,
  setSession: (session) => set({ session, isLoading: false }),
  setIsPasswordRecovery: (isPasswordRecovery) => set({ isPasswordRecovery }),
}));

let listenerStarted = false;

export function startSessionListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  authService.getSession().then((session) => useSessionStore.getState().setSession(session));

  authService.onAuthStateChange(async (event, session) => {
    useSessionStore.getState().setSession(session);
    if (event === 'SIGNED_OUT') {
      useSessionStore.getState().setIsPasswordRecovery(false);
    }
  });
}
