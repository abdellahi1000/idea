import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSignUp } from '@/features/auth/hooks/use-sign-up';
import { runAccessGate } from '@/features/auth/utilities/run-access-gate';
import { signUpSchema, type SignUpFormValues } from '@/utilities/validation/auth.schema';

export function SignUpScreen() {
  const signUp = useSignUp();
  const { control, handleSubmit, formState } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await signUp.mutateAsync(values);

      if (data.session && data.user) {
        // Confirmation-free project (or already confirmed): a session
        // exists immediately, so the gate can run now - a brand new account
        // is always 'pending', so this correctly signs the user back out
        // with the "awaiting approval" message.
        await runAccessGate(data.user.id);
        return;
      }

      // Email confirmation required: no session yet, so the gate runs on
      // first sign-in instead (see sign-in-screen.tsx).
      Alert.alert('Check your email', 'Confirm your email address to finish signing up, then sign in.');
      router.replace('/sign-in');
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.form}>
          <ThemedText type="title">Create account</ThemedText>

          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <FormTextField
                label="Full name"
                value={field.value}
                onChangeText={field.onChange}
                error={formState.errors.fullName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <FormTextField
                label="Phone number"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={formState.errors.phone?.message}
              />
            )}
          />

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

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormTextField
                label="Password"
                secureTextEntry
                value={field.value}
                onChangeText={field.onChange}
                error={formState.errors.password?.message}
              />
            )}
          />

          <PrimaryButton title="Sign up" onPress={onSubmit} loading={signUp.isPending} />

          <Link href="/sign-in" style={styles.link}>
            <ThemedText type="link" themeColor="textSecondary">
              Already have an account? Sign in
            </ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center' },
  form: { gap: Spacing.three, padding: Spacing.four },
  link: { alignSelf: 'center', marginTop: Spacing.three },
});
