import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVerifyPin } from '@/features/auth/hooks/use-verify-pin';
import { useIdentityVerification } from '@/features/identity-verification/hooks/use-identity-verification';
import { supabase } from '@/services/supabase/client';

type Step = 'current' | 'new';

export function ChangePinScreen() {
  const { data: verification, isLoading } = useIdentityVerification();
  const verifyPin = useVerifyPin();
  const [step, setStep] = useState<Step>('current');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onCurrentPinComplete = async (pin: string) => {
    const isValid = await verifyPin.mutateAsync(pin);
    if (!isValid) {
      setError('Incorrect PIN. Please try again.');
      return;
    }
    setError(null);
    setStep('new');
  };

  const onNewPinComplete = async (pin: string) => {
    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('set_login_pin', { p_pin: pin });
      if (rpcError) throw rpcError;
      Alert.alert('PIN updated', 'Your login PIN has been changed.');
      router.back();
    } catch (err) {
      Alert.alert('Failed to update PIN', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (verification?.status !== 'approved') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Change Login PIN</ThemedText>
          <ThemedText themeColor="textSecondary">
            Verify your identity before you can change your login PIN.
          </ThemedText>
          <PrimaryButton title="Go to Identity Verification" onPress={() => router.push('/identity-verification')} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{step === 'current' ? 'Enter current PIN' : 'Enter new PIN'}</ThemedText>
        <PinPad
          onComplete={step === 'current' ? onCurrentPinComplete : onNewPinComplete}
          loading={verifyPin.isPending || saving}
          error={error}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three, alignItems: 'center' },
});
