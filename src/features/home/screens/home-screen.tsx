import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/balance-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useAccessGateCheck } from '@/features/home/hooks/use-access-gate-check';
import { useFaceIdentityPrompt } from '@/features/home/hooks/use-face-identity-prompt';
import { useRecentTransactions } from '@/features/home/hooks/use-recent-transactions';
import { useWalletBalance } from '@/features/wallet/hooks/use-wallet-balance';

export function HomeScreen() {
  useAccessGateCheck();
  useFaceIdentityPrompt();

  const { data: profile } = useProfile();
  const { data: wallet, isLoading: isWalletLoading } = useWalletBalance();
  const { data: recentTransactions, isLoading: isTransactionsLoading } = useRecentTransactions(wallet?.id);

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.welcome}>
          Welcome{firstName ? `, ${firstName}` : ''}
        </ThemedText>

        {isWalletLoading || !wallet ? (
          <ActivityIndicator />
        ) : (
          <BalanceCard
            balance={wallet.balance}
            currencyCode={wallet.currency_code}
            accountIdentifier={profile?.phone ?? '—'}
            lastUpdatedAt={wallet.updated_at}
          />
        )}

        <ThemedView style={styles.quickActions}>
          <ThemedView style={styles.quickActionButton}>
            <PrimaryButton title="Send Money" onPress={() => router.push('/send-money')} />
          </ThemedView>
          <ThemedView style={styles.quickActionButton}>
            <PrimaryButton title="Receive Money" onPress={() => router.push('/receive-money')} />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.recentHeader}>
          <ThemedText type="subtitle">Recent Transactions</ThemedText>
        </ThemedView>

        {isTransactionsLoading ? (
          <ActivityIndicator />
        ) : !recentTransactions?.length ? (
          <ThemedText themeColor="textSecondary">No transactions yet.</ThemedText>
        ) : (
          recentTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}

        <PrimaryButton title="View All Transactions" onPress={() => router.push('/transactions')} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  welcome: { marginBottom: Spacing.one },
  quickActions: { flexDirection: 'row', gap: Spacing.two },
  quickActionButton: { flex: 1 },
  recentHeader: { marginTop: Spacing.two },
});
