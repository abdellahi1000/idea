import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { useSessionStore } from '@/features/auth/hooks/use-session';
import { profileRepository } from '@/repositories/profile.repository';

// Enrollment lives in SecureStore, scoped to this device installation - the
// server's profiles.biometric_enabled flag is informational only, never
// trusted by the app itself. This is what makes "never trust previous
// biometric enrollment on a new device" true automatically: a new install
// simply has no SecureStore entry yet, regardless of what the server flag
// says for the account.
const STORAGE_KEY = 'jojo.biometricEnrolled';

export function useBiometric() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((value) => {
      setEnrolled(value === 'true');
      setLoading(false);
    });
  }, []);

  const enable = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isDeviceEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isDeviceEnrolled) {
      throw new Error('Biometric authentication is not available on this device.');
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm to enable biometric login',
    });
    if (!result.success) {
      throw new Error('Biometric confirmation failed.');
    }

    await SecureStore.setItemAsync(STORAGE_KEY, 'true');
    setEnrolled(true);
    if (userId) {
      await profileRepository.update(userId, { biometric_enabled: true });
    }
  }, [userId]);

  const disable = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setEnrolled(false);
    if (userId) {
      await profileRepository.update(userId, { biometric_enabled: false });
    }
  }, [userId]);

  return { enrolled, loading, enable, disable };
}
