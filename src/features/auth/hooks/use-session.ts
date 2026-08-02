import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { authService } from '@/services/auth.service';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
}));

let listenerStarted = false;

export function startSessionListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  authService.getSession().then((session) => useSessionStore.getState().setSession(session));

  authService.onAuthStateChange(async (_event, session) => {
    useSessionStore.getState().setSession(session);
  });
}
