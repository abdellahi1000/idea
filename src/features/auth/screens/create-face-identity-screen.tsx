import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { FaceRecordingCamera } from '@/components/face-recording-camera';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth/hooks/use-session';
import { faceIdentityService } from '@/services/face-identity.service';
import { profileRepository } from '@/repositories/profile.repository';

const CHALLENGE = ['Look Right', 'Look Left', 'Look Down', 'Look Up', 'Blink'];

type Step = 'prompt' | 'recording' | 'uploading';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function CreateFaceIdentityScreen() {
  const userId = useSessionStore((state) => state.session?.user.id);
  const [step, setStep] = useState<Step>('prompt');
  const queryClient = useQueryClient();

  const { data: existingIdentity, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['face-identity', userId],
    queryFn: () => faceIdentityService.getOwn(userId as string),
    enabled: !!userId,
  });

  const onSkip = async () => {
    if (userId) {
      try {
        await profileRepository.update(userId, { face_identity_prompt_skipped: true });
      } catch (error) {
        // Not critical to block navigation on - worst case we ask again next session.
        console.warn('Failed to persist face_identity_prompt_skipped', error);
      }
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const onRecordingComplete = async (localUri: string) => {
    if (!userId) return;
    setStep('uploading');
    try {
      await faceIdentityService.createFirstFaceIdentity(userId, localUri);
      await queryClient.invalidateQueries({ queryKey: ['face-identity', userId] });
      Alert.alert('Face Identity created', 'Your JOJO Face Identity has been saved securely.');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/home');
      }
    } catch (error) {
      Alert.alert('Failed to save', error instanceof Error ? error.message : 'Please try again.');
      setStep('prompt');
    }
  };

  if (step === 'recording') {
    return (
      <FaceRecordingCamera
        challenge={CHALLENGE}
        onComplete={onRecordingComplete}
        onCancel={() => setStep('prompt')}
      />
    );
  }

  if (step === 'uploading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">Saving your Face Identity…</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (isLoadingStatus) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (existingIdentity) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">JOJO Face Identity</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your JOJO Face Identity has already been created. It is your permanent reference and cannot be
            changed or recorded again from the app - only an administrator can reinitialize it after
            manually verifying your identity.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.statusCard}>
            <ThemedText type="smallBold">Verification Status: Active</ThemedText>
            <ThemedText themeColor="textSecondary">Created: {formatDate(existingIdentity.created_at)}</ThemedText>
          </ThemedView>

          <PrimaryButton
            title="Done"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Create your JOJO Face Identity</ThemedText>
        <ThemedText themeColor="textSecondary">
          For better account security and easy device transfer, we recommend creating your JOJO Face
          Identity.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Without it, recovering your account or transferring it to a new device may require visiting a
          JOJO agency.
        </ThemedText>

        <PrimaryButton title="Create Face Identity" onPress={() => setStep('recording')} />
        <PrimaryButton title="Skip" onPress={onSkip} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  statusCard: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.one },
});
