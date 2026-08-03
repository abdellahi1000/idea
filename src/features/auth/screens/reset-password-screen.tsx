import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth/hooks/use-session';
import { authService } from '@/services/auth.service';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/utilities/validation/auth.schema';

type Status = 'exchanging' | 'ready' | 'invalid' | 'submitting';

export function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const setIsPasswordRecovery = useSessionStore((state) => state.setIsPasswordRecovery);
  const [status, setStatus] = useState<Status>(() => (code ? 'exchanging' : 'invalid'));

  const { control, handleSubmit, formState } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (!code) {
      return;
    }
    // Must flip this before establishing the recovery session, otherwise
    // the root layout's session guard would route straight to Home before
    // the user has a chance to set a new password.
    setIsPasswordRecovery(true);
    authService
      .exchangeCodeForSession(code)
      .then(() => setStatus('ready'))
      .catch(() => {
        setIsPasswordRecovery(false);
        setStatus('invalid');
      });
  }, [code, setIsPasswordRecovery]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus('submitting');
    try {
      await authService.updatePassword(values.password);
      await authService.signOut();
      setIsPasswordRecovery(false);
      Alert.alert('Password updated', 'Sign in with your new password.');
      router.replace('/sign-in');
    } catch (error) {
      Alert.alert('Failed to update password', error instanceof Error ? error.message : 'Please try again.');
      setStatus('ready');
    }
  });

  if (status === 'exchanging') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.centered}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (status === 'invalid') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Link expired</ThemedText>
          <ThemedText themeColor="textSecondary">
            This password reset link is invalid or has expired. Request a new one from the Login screen.
          </ThemedText>
          <PrimaryButton title="Back to Login" onPress={() => router.replace('/sign-in')} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Set a new password</ThemedText>

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormTextField
              label="New Password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.password?.message}
            />
          )}
        />

        <PrimaryButton title="Update Password" onPress={onSubmit} loading={status === 'submitting'} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
