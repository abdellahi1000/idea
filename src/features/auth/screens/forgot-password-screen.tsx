import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/utilities/validation/auth.schema';

export function ForgotPasswordScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await authService.resetPassword(values.email, Linking.createURL('/reset-password'));
    } catch {
      // Never reveal whether the email exists - same message either way.
    } finally {
      setIsSubmitting(false);
      setSent(true);
    }
  });

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title">Check your email</ThemedText>
          <ThemedText themeColor="textSecondary">
            If an account exists for that email address, we&apos;ve sent a link to reset your password.
          </ThemedText>
          <PrimaryButton title="Back to Login" onPress={() => router.replace('/sign-in')} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Forgot Password?</ThemedText>
        <ThemedText themeColor="textSecondary">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </ThemedText>

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormTextField
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.email?.message}
            />
          )}
        />

        <PrimaryButton title="Send Reset Link" onPress={onSubmit} loading={isSubmitting} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
});
