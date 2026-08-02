import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePendingRecoveryCodeStore } from '@/features/auth/hooks/use-pending-recovery-code';
import {
  useCreateRecoveryCode,
  useGenerateRecoveryCodeCandidate,
  useRecoveryCodeStatus,
  useRevealRecoveryCodeOnce,
} from '@/features/profile/hooks/use-recovery-codes';
import { useTheme } from '@/hooks/use-theme';
import { DuplicateRecoveryCodeError } from '@/repositories/recovery-code.repository';
import { getRecoveryCodeFormatError, isValidRecoveryCode, sanitizeRecoveryCodeInput } from '@/utilities/validation/recovery-code';

const INSTRUCTIONS = [
  'Your Recovery Code is shown only once, right after you create it.',
  'Save it somewhere safe immediately - it cannot be viewed again unless an administrator explicitly authorizes a one-time view after verifying your identity.',
  'Never share your Recovery Code with anyone, including JOJO staff.',
  'Keep an offline backup, separate from this device.',
  'Print it if that helps you keep it safe.',
  'Writing it down on paper and storing it securely is also fine.',
  'Never send your Recovery Code through messaging apps or email.',
  'Losing your Recovery Code may permanently prevent account recovery.',
].join('\n\n');

export function RecoveryCodeScreen() {
  const theme = useTheme();
  const { data: status, isLoading } = useRecoveryCodeStatus();
  const generateCandidate = useGenerateRecoveryCodeCandidate();
  const createCode = useCreateRecoveryCode();
  const revealOnce = useRevealRecoveryCodeOnce();
  const setPendingRecoveryCode = usePendingRecoveryCodeStore((state) => state.setCode);

  const [showInstructions, setShowInstructions] = useState(false);
  const [code, setCode] = useState('');

  const formatError = getRecoveryCodeFormatError(code);
  const canCreate = isValidRecoveryCode(code) && !createCode.isPending;

  const onChangeText = (raw: string) => {
    setCode(sanitizeRecoveryCodeInput(raw));
  };

  const onGenerate = async () => {
    try {
      const candidate = await generateCandidate.mutateAsync();
      setCode(candidate);
    } catch (error) {
      Alert.alert('Failed to generate code', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const performCreate = async () => {
    try {
      await createCode.mutateAsync(code);
      setPendingRecoveryCode(code);
      setCode('');
      router.push('/save-recovery-code');
    } catch (error) {
      if (error instanceof DuplicateRecoveryCodeError) {
        Alert.alert('Code already taken', error.message);
        return;
      }
      Alert.alert('Failed to create code', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onCreatePress = () => {
    Alert.alert(
      'Create Recovery Code?',
      'After creating your Recovery Code, it will only be shown once. Make sure you save it in a secure place. You will never be able to view it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: performCreate },
      ],
    );
  };

  const onViewOnce = async () => {
    try {
      const revealed = await revealOnce.mutateAsync();
      if (!revealed) {
        Alert.alert('Not available', 'This one-time view has already been used or was not granted.');
        return;
      }
      setPendingRecoveryCode(revealed);
      router.push('/save-recovery-code');
    } catch (error) {
      Alert.alert('Failed to reveal code', error instanceof Error ? error.message : 'Please try again.');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Security Recovery Code</ThemedText>

        {status?.hasCode ? (
          <>
            <ThemedView type="backgroundElement" style={styles.statusCard}>
              <ThemedText type="smallBold">Created</ThemedText>
            </ThemedView>

            {status.canViewOnce ? (
              <PrimaryButton
                title="View My Recovery Code (one-time)"
                onPress={onViewOnce}
                loading={revealOnce.isPending}
              />
            ) : null}

            <PrimaryButton title="View Instructions" onPress={() => setShowInstructions(true)} />
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              Create a 6-character Recovery Code: exactly 2 letters and 4 digits, in any order (e.g. AB1234).
            </ThemedText>

            <ThemedView style={styles.inputRow}>
              <TextInput
                value={code}
                onChangeText={onChangeText}
                placeholder="AB1234"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={6}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: formatError ? theme.danger : theme.backgroundSelected },
                ]}
              />
            </ThemedView>

            {formatError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {formatError}
              </ThemedText>
            ) : null}

            <PrimaryButton
              title="⟳  Generate Code"
              onPress={onGenerate}
              loading={generateCandidate.isPending}
            />

            <PrimaryButton
              title="Create Recovery Code"
              onPress={onCreatePress}
              disabled={!canCreate}
              loading={createCode.isPending}
            />

            <PrimaryButton title="View Instructions" onPress={() => setShowInstructions(true)} />
          </>
        )}

        <Modal visible={showInstructions} transparent animationType="fade">
          <ThemedView style={styles.overlay}>
            <ThemedView type="backgroundElement" style={styles.sheet}>
              <ThemedText type="smallBold">Security Recovery Code</ThemedText>
              <ThemedText themeColor="textSecondary">{INSTRUCTIONS}</ThemedText>
              <PrimaryButton title="Close" onPress={() => setShowInstructions(false)} />
            </ThemedView>
          </ThemedView>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  statusCard: { padding: Spacing.three, borderRadius: Spacing.two },
  inputRow: { flexDirection: 'row' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.three, width: '100%' },
});
