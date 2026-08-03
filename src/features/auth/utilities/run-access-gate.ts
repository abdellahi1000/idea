import { router } from 'expo-router';
import { Alert } from 'react-native';

import { deviceRepository } from '@/repositories/device.repository';
import { profileRepository } from '@/repositories/profile.repository';
import { authService } from '@/services/auth.service';
import { deviceService } from '@/services/device.service';
import { deviceTransferService } from '@/services/device-transfer.service';

/**
 * The single place that decides where a signed-in user is allowed to go:
 * pending/rejected accounts are signed back out immediately ("deny login"
 * per the doc, not just a blocked screen), approved accounts without a PIN
 * are forced to set one before anything else, and everyone else reaches
 * Home. Called right after sign-in, after the post-signup recovery-code
 * reveal, and defensively on Home's own mount (in case status changes while
 * the app is already open).
 */
export async function runAccessGate(userId: string): Promise<void> {
  const profile = await profileRepository.getOwn(userId);

  if (profile.approval_status === 'pending') {
    await authService.signOut();
    Alert.alert(
      'Account pending approval',
      'Your account has been created successfully. Please wait until an administrator reviews and approves your account.',
    );
    router.replace('/sign-in');
    return;
  }

  if (profile.approval_status === 'rejected') {
    await authService.signOut();
    Alert.alert(
      'Account not approved',
      profile.approval_rejection_reason ?? 'Your account verification was rejected.',
    );
    router.replace('/sign-in');
    return;
  }

  const hasPin = await profileRepository.hasLoginPin();
  if (!hasPin) {
    router.replace('/set-pin');
    return;
  }

  const installationId = await deviceTransferService.getCurrentInstallationId();
  const currentDevice = await deviceRepository.findByInstallationId(userId, installationId);

  if (currentDevice?.status === 'active') {
    router.replace('/home');
    return;
  }

  const hasOtherActiveDevice = await deviceRepository.hasActiveDevice(userId);
  if (!hasOtherActiveDevice) {
    // First device ever registered for this account - no transfer needed.
    const device = currentDevice ?? (await deviceService.registerCurrentDevice(userId));
    await deviceService.activateDevice(device.id);
    router.replace('/home');
    return;
  }

  router.replace('/new-device-detected');
}
