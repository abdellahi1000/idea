import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function ForgotPinScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Forgot your Login PIN?</ThemedText>
        <ThemedText themeColor="textSecondary">
          If you know your account password, sign in with Email & Password instead.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Otherwise, contact JOJO or visit an agency to have an administrator reset your Login PIN. You&apos;ll
          be asked to set a new one the next time you sign in.
        </ThemedText>

        <PrimaryButton title="Back to Login" onPress={() => router.replace('/sign-in')} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
});
