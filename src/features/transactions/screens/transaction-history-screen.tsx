import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TransactionRow } from '@/features/transactions/components/transaction-row';
import { useTransactionHistory } from '@/features/transactions/hooks/use-transaction-history';
import { useWalletBalance } from '@/features/wallet/hooks/use-wallet-balance';
import type { Transaction } from '@/models/transaction.model';

export function TransactionHistoryScreen() {
  const { data: wallet } = useWalletBalance();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactionHistory(wallet?.id);

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Transactions
        </ThemedText>

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
            ListEmptyComponent={<ThemedText themeColor="textSecondary">No transactions yet.</ThemedText>}
            renderItem={({ item }: { item: Transaction }) => <TransactionRow transaction={item} />}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
});
