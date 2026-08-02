import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePendingRecoveryCodeStore } from '@/features/auth/hooks/use-pending-recovery-code';
import { useSessionStore } from '@/features/auth/hooks/use-session';
import { runAccessGate } from '@/features/auth/utilities/run-access-gate';

const MASK = '••••••';

export function SaveRecoveryCodeScreen() {
  const code = usePendingRecoveryCodeStore((state) => state.code);
  const setCode = usePendingRecoveryCodeStore((state) => state.setCode);
  const userId = useSessionStore((state) => state.session?.user.id);
  const [saved, setSaved] = useState(false);

  const onSave = () => {
    setSaved(true);
  };

  const onDone = async () => {
    setCode(null);
    if (userId) {
      await runAccessGate(userId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Your Recovery Code</ThemedText>
        <ThemedText themeColor="textSecondary">
          {saved
            ? 'Your Recovery Code is now hidden. It will not be shown again unless an administrator explicitly authorizes a one-time view.'
            : 'This is the only time your Recovery Code will be shown. Save it now - it cannot be recovered later.'}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.codeBox}>
          <ThemedText type="code" style={styles.codeText}>
            {saved ? MASK : code}
          </ThemedText>
        </ThemedView>

        {saved ? (
          <PrimaryButton title="Done" onPress={onDone} />
        ) : (
          <PrimaryButton title="Save" onPress={onSave} />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.four, justifyContent: 'center' },
  codeBox: { padding: Spacing.four, borderRadius: Spacing.three, alignItems: 'center' },
  codeText: { fontSize: 32, letterSpacing: 6 },
});
