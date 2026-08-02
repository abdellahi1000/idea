import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { runAccessGate } from '@/features/auth/utilities/run-access-gate';
import { signInSchema, type SignInFormValues } from '@/utilities/validation/auth.schema';

export function SignInScreen() {
  const signIn = useSignIn();
  const { control, handleSubmit, formState } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await signIn.mutateAsync(values);
      await runAccessGate(data.user.id);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Welcome back</ThemedText>

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

        <PrimaryButton title="Sign in" onPress={onSubmit} loading={signIn.isPending} />

        <Link href="/sign-up" style={styles.link}>
          <ThemedText type="link" themeColor="textSecondary">
            Don&apos;t have an account? Sign up
          </ThemedText>
        </Link>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  link: { alignSelf: 'center', marginTop: Spacing.three },
});
