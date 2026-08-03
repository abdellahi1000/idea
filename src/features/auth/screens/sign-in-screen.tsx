import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Dropdown } from '@/components/dropdown';
import { FormTextField } from '@/components/form-text-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePhoneSignIn } from '@/features/auth/hooks/use-phone-sign-in';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { runAccessGate } from '@/features/auth/utilities/run-access-gate';
import { LANGUAGE_LABELS, SIGN_IN_TRANSLATIONS } from '@/utilities/i18n/sign-in-translations';
import { localPreferences, type AuthMethod, type Language } from '@/utilities/local-preferences';
import {
  phoneSignInSchema,
  signInSchema,
  type PhoneSignInFormValues,
  type SignInFormValues,
} from '@/utilities/validation/auth.schema';

const LANGUAGE_OPTIONS: { label: string; value: Language }[] = (
  ['ar', 'fr', 'en'] as const
).map((value) => ({ value, label: LANGUAGE_LABELS[value] }));

export function SignInScreen() {
  const [method, setMethod] = useState<AuthMethod>('email');
  const [language, setLanguage] = useState<Language>('en');
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const t = SIGN_IN_TRANSLATIONS[language];

  const signIn = useSignIn();
  const emailForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneSignIn = usePhoneSignIn();
  const phoneForm = useForm<PhoneSignInFormValues>({
    resolver: zodResolver(phoneSignInSchema),
    defaultValues: { phone: '', pin: '' },
  });

  useEffect(() => {
    localPreferences.getLanguage().then((saved) => {
      if (saved) setLanguage(saved);
    });
    localPreferences.getLastAuthMethod().then((saved) => {
      if (saved) setMethod(saved);
    });
    localPreferences.getLastEmail().then((saved) => {
      if (saved) emailForm.setValue('email', saved);
    });
    localPreferences.getLastPhone().then((saved) => {
      if (saved) phoneForm.setValue('phone', saved);
    });
    // Runs once on mount to restore the last session's language/identifier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeLanguage = (next: Language) => {
    setLanguage(next);
    localPreferences.setLanguage(next);
  };

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    try {
      const data = await signIn.mutateAsync(values);
      await localPreferences.rememberLastLogin('email', values.email);
      await runAccessGate(data.user.id);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  const onSubmitPhone = phoneForm.handleSubmit(async (values) => {
    try {
      const data = await phoneSignIn.mutateAsync(values);
      if (!data.user) throw new Error('Sign in failed. Please try again.');
      await localPreferences.rememberLastLogin('phone', values.phone);
      await runAccessGate(data.user.id);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.topRow}>
          <Dropdown
            value={method}
            onChange={setMethod}
            open={methodDropdownOpen}
            onOpenChange={setMethodDropdownOpen}
            options={[
              { value: 'phone', label: t.loginWithPhone },
              { value: 'email', label: t.loginWithEmail },
            ]}
          />
          <Dropdown
            value={language}
            onChange={onChangeLanguage}
            open={languageDropdownOpen}
            onOpenChange={setLanguageDropdownOpen}
            accentColor="#5B6B63"
            options={LANGUAGE_OPTIONS}
          />
        </ThemedView>

        <ThemedText type="title">{t.welcomeBack}</ThemedText>

        {method === 'email' ? (
          <>
            <Controller
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormTextField
                  label={t.email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={emailForm.formState.errors.email?.message}
                />
              )}
            />

            <Controller
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormTextField
                  label={t.password}
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  error={emailForm.formState.errors.password?.message}
                />
              )}
            />

            <PrimaryButton title={t.login} onPress={onSubmitEmail} loading={signIn.isPending} />

            <Link href="/forgot-password" style={styles.link}>
              <ThemedText type="link" themeColor="textSecondary">
                {t.forgotPassword}
              </ThemedText>
            </Link>
          </>
        ) : (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field }) => (
                <FormTextField
                  label={t.phoneNumber}
                  keyboardType="phone-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={phoneForm.formState.errors.phone?.message}
                />
              )}
            />

            <Controller
              control={phoneForm.control}
              name="pin"
              render={({ field }) => (
                <FormTextField
                  label={t.loginPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={phoneForm.formState.errors.pin?.message}
                />
              )}
            />

            <PrimaryButton title={t.login} onPress={onSubmitPhone} loading={phoneSignIn.isPending} />

            <Link href="/forgot-pin" style={styles.link}>
              <ThemedText type="link" themeColor="textSecondary">
                {t.forgotPin}
              </ThemedText>
            </Link>
          </>
        )}

        <Link href="/sign-up" style={styles.link}>
          <ThemedText type="link" themeColor="textSecondary">
            {t.noAccountSignUp}
          </ThemedText>
        </Link>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { alignSelf: 'center', marginTop: Spacing.one },
});
