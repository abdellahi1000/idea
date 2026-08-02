import { create } from 'zustand';

interface PendingRecoveryCodeState {
  code: string | null;
  setCode: (code: string | null) => void;
}

// Short-lived, in-memory only - the plaintext recovery code passes through
// here instead of a URL param so it never lands in navigation history or
// deep-link logs. Cleared once the reveal screen is dismissed.
export const usePendingRecoveryCodeStore = create<PendingRecoveryCodeState>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));
