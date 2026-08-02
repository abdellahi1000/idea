import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormTextField } from '@/components/form-text-field';
import { PinPad } from '@/components/pin-pad';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVerifyPin } from '@/features/auth/hooks/use-verify-pin';
import { useCreateTransaction } from '@/features/transactions/hooks/use-create-transaction';
import { useWalletBalance } from '@/features/wallet/hooks/use-wallet-balance';
import { profileRepository } from '@/repositories/profile.repository';
import { sendMoneySchema, type SendMoneyFormValues } from '@/utilities/validation/send-money.schema';

export function SendMoneyScreen() {
  const { data: wallet } = useWalletBalance();
  const createTransaction = useCreateTransaction();
  const verifyPin = useVerifyPin();
  const [pendingTransfer, setPendingTransfer] = useState<SendMoneyFormValues | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Defense in depth: sending money always requires a PIN, and the
  // post-login gate already guarantees one exists before Home is reachable
  // - but re-check here too rather than relying solely on that gate.
  useEffect(() => {
    profileRepository.hasLoginPin().then((hasPin) => {
      if (!hasPin) {
        router.replace('/set-pin');
      }
    });
  }, []);

  const { control, handleSubmit, formState } = useForm<SendMoneyFormValues>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: { recipientPhone: '', amount: '', note: '' },
  });

  const onSubmitDetails = handleSubmit((values) => {
    setPinError(null);
    setPendingTransfer(values);
  });

  const onPinComplete = async (pin: string) => {
    if (!wallet || !pendingTransfer) return;

    const isValidPin = await verifyPin.mutateAsync(pin);
    if (!isValidPin) {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }
    setPinError(null);

    const amount = Number(pendingTransfer.amount);
    try {
      await createTransaction.mutateAsync({
        senderWalletId: wallet.id,
        recipientPhone: pendingTransfer.recipientPhone,
        amount,
        note: pendingTransfer.note,
      });
      Alert.alert('Money Sent Successfully', `You sent ${amount} ${wallet.currency_code}.`);
      router.back();
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Please try again.');
      setPendingTransfer(null);
    }
  };

  if (pendingTransfer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.pinContainer}>
          <ThemedText type="title">Enter your PIN</ThemedText>
          <ThemedText themeColor="textSecondary">Confirm this transfer with your login PIN.</ThemedText>

          <PinPad
            onComplete={onPinComplete}
            loading={verifyPin.isPending || createTransaction.isPending}
            error={pinError}
          />

          <PrimaryButton title="Cancel" onPress={() => setPendingTransfer(null)} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Send money</ThemedText>

        <Controller
          control={control}
          name="recipientPhone"
          render={({ field }) => (
            <FormTextField
              label="Phone Number or Account Number"
              keyboardType="phone-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.recipientPhone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <FormTextField
              label="Amount"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.amount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <FormTextField
              label="Description (Optional)"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.note?.message}
            />
          )}
        />

        <PrimaryButton title="Send Money" onPress={onSubmitDetails} disabled={!wallet} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  pinContainer: { flex: 1, padding: Spacing.four, gap: Spacing.three, alignItems: 'center' },
});
