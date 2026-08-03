import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { FaceRecordingCamera } from '@/components/face-recording-camera';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth/hooks/use-session';
import { profileRepository } from '@/repositories/profile.repository';
import { settingsRepository, type PublicSettings } from '@/repositories/settings.repository';
import { deviceTransferService } from '@/services/device-transfer.service';

const MAX_FACE_VERIFICATION_ATTEMPTS = 3;

async function getFaceVerificationDenialMessage(userId: string): Promise<{ title: string; body: string }> {
  try {
    const profile = await profileRepository.getOwn(userId);
    if (profile.face_verification_disabled) {
      return {
        title: 'Face Verification locked',
        body: 'For your security, Face Verification has been locked. Please visit a JOJO agency to recover your account.',
      };
    }

    const remaining = Math.max(0, MAX_FACE_VERIFICATION_ATTEMPTS - profile.face_verification_failure_count);
    const lockedUntil = profile.face_verification_locked_until
      ? new Date(profile.face_verification_locked_until)
      : null;
    const lockMessage =
      lockedUntil && lockedUntil.getTime() > Date.now()
        ? ` You can try again after ${lockedUntil.toLocaleString()}.`
        : '';

    return {
      title: 'Verification failed',
      body: `Face verification failed. Please try again.\n\nRemaining attempts: ${remaining}${lockMessage}`,
    };
  } catch {
    return {
      title: 'Verification failed',
      body: 'Your Face Identity verification was not approved. Please try again or visit a JOJO agency.',
    };
  }
}

type Step =
  | { kind: 'loading' }
  | { kind: 'choose'; settings: PublicSettings }
  | { kind: 'qr'; requestId: string; code: string }
  | { kind: 'face-record'; requestId: string; challenge: string[] }
  | { kind: 'waiting-review'; requestId: string }
  | { kind: 'recovery-code'; requestId: string };

export function NewDeviceDetectedScreen() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRepository
      .getPublicSettings()
      .catch(() => ({}))
      .then((settings) => setStep({ kind: 'choose', settings }));
  }, []);

  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  const watchRequest = (requestId: string) => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = deviceTransferService.subscribeToRequest(requestId, (request) => {
      if (request.status === 'approved') {
        setStep({ kind: 'recovery-code', requestId });
      } else if (request.status === 'denied') {
        if (userId) {
          getFaceVerificationDenialMessage(userId).then(({ title, body }) => Alert.alert(title, body));
        } else {
          Alert.alert(
            'Verification failed',
            'Your Face Identity verification was not approved. Please try again or visit a JOJO agency.',
          );
        }
        setStep({ kind: 'choose', settings: {} });
      } else if (request.status === 'expired') {
        Alert.alert('Request expired', 'Please start again.');
        setStep({ kind: 'choose', settings: {} });
      }
    });
  };

  const onChooseQr = async () => {
    try {
      const { requestId } = await deviceTransferService.start('qr_code');
      const { code } = await deviceTransferService.createQrCode(requestId);
      setStep({ kind: 'qr', requestId, code });
      watchRequest(requestId);
    } catch (error) {
      Alert.alert('Could not start QR transfer', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onChooseFace = async () => {
    try {
      const { requestId } = await deviceTransferService.start('face_id');
      const challenge = deviceTransferService.generateChallenge();
      setStep({ kind: 'face-record', requestId, challenge });
    } catch (error) {
      Alert.alert('Could not start Face Identity transfer', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onFaceRecorded = async (requestId: string, challenge: string[], localUri: string) => {
    if (!userId) return;
    try {
      await deviceTransferService.submitFaceVerification(userId, requestId, localUri, challenge);
      setStep({ kind: 'waiting-review', requestId });
      watchRequest(requestId);
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again.');
      setStep({ kind: 'choose', settings: {} });
    }
  };

  const onCompleteTransfer = async (requestId: string) => {
    setIsCompleting(true);
    try {
      await deviceTransferService.complete(requestId, recoveryCode);
      router.replace('/home');
    } catch (error) {
      Alert.alert('Incorrect recovery code', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (step.kind === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centered}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (step.kind === 'choose') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">New Device Detected</ThemedText>
          <ThemedText themeColor="textSecondary">
            We don&apos;t recognize this device. Verify it&apos;s you before continuing.
          </ThemedText>

          {step.settings.qr_code_available !== false && (
            <PrimaryButton title="Use QR Code (scan with your trusted device)" onPress={onChooseQr} />
          )}
          {step.settings.face_id_available !== false && (
            <PrimaryButton title="Use Face Identity" onPress={onChooseFace} />
          )}
          <ThemedText themeColor="textSecondary" type="small">
            Fingerprint verification is coming soon.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (step.kind === 'qr') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centered}>
          <ThemedText type="title">Scan with your trusted device</ThemedText>
          <ThemedText themeColor="textSecondary">
            Open JOJO on your other device, go to Devices, and scan this code within 5 minutes.
          </ThemedText>
          <QRCode value={step.code} size={220} />
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (step.kind === 'face-record') {
    return (
      <FaceRecordingCamera
        challenge={step.challenge}
        onComplete={(uri) => onFaceRecorded(step.requestId, step.challenge, uri)}
        onCancel={() => setStep({ kind: 'choose', settings: {} })}
      />
    );
  }

  if (step.kind === 'waiting-review') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centered}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            Your Face Identity is being reviewed. This may take a moment.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Enter your Security Recovery Code</ThemedText>
        <ThemedText themeColor="textSecondary">
          As a final step, enter your permanent Security Recovery Code to activate this device.
        </ThemedText>
        <TextInput
          value={recoveryCode}
          onChangeText={(text) => setRecoveryCode(text.toUpperCase())}
          placeholder="AB1234"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        <PrimaryButton
          title="Activate Device"
          onPress={() => onCompleteTransfer(step.requestId)}
          loading={isCompleting}
          disabled={!recoveryCode}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
});
