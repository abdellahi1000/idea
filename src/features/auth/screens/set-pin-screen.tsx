import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/components/pin-pad';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/services/supabase/client';

type Step = 'choose' | 'enter' | 'confirm';

export function SetPinScreen() {
  const [length, setLength] = useState<4 | 6>(6);
  const [step, setStep] = useState<Step>('choose');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseLength = (value: 4 | 6) => {
    setLength(value);
    setStep('enter');
  };

  const onEnterComplete = (pin: string) => {
    setFirstPin(pin);
    setError(null);
    setStep('confirm');
  };

  const onConfirmComplete = async (pin: string) => {
    if (pin !== firstPin) {
      setError('PINs do not match. Try again.');
      setFirstPin('');
      setStep('enter');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('set_login_pin', { p_pin: pin });
      if (rpcError) throw rpcError;
      router.replace('/home');
    } catch (err) {
      Alert.alert('Failed to set PIN', err instanceof Error ? err.message : 'Please try again.');
      setFirstPin('');
      setStep('choose');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Create your login PIN</ThemedText>
        <ThemedText themeColor="textSecondary">
          You&apos;ll use this PIN to sign in and confirm sending money. Choose something only you know.
        </ThemedText>

        {step === 'choose' ? (
          <ThemedView style={styles.chooseRow}>
            <ThemedView style={styles.chooseButton}>
              <PrimaryButton title="4-digit PIN" onPress={() => chooseLength(4)} />
            </ThemedView>
            <ThemedView style={styles.chooseButton}>
              <PrimaryButton title="6-digit PIN" onPress={() => chooseLength(6)} />
            </ThemedView>
          </ThemedView>
        ) : (
          <ThemedView style={styles.padContainer}>
            <ThemedText type="smallBold">
              {step === 'enter' ? 'Enter your new PIN' : 'Confirm your new PIN'}
            </ThemedText>
            <PinPad
              key={step}
              length={length}
              onComplete={step === 'enter' ? onEnterComplete : onConfirmComplete}
              loading={saving}
              error={error}
            />
          </ThemedView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.four, alignItems: 'center' },
  chooseRow: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch' },
  chooseButton: { flex: 1 },
  padContainer: { gap: Spacing.three, alignItems: 'center' },
});
