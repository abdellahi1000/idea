import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTransaction } from '@/features/transactions/hooks/use-transaction';
import { formatCurrency } from '@/utilities/currency';
import { formatTransactionStatus } from '@/utilities/transaction-status';

type Props = { transactionId: string };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

export function TransactionDetailScreen({ transactionId }: Props) {
  const { data: transaction, isLoading } = useTransaction(transactionId);

  if (isLoading || !transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loading}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  const isSent = transaction.direction === 'sent';
  const sender = isSent ? 'You' : (transaction.counterparty_name ?? 'Unknown');
  const receiver = isSent ? (transaction.counterparty_name ?? 'Unknown') : 'You';
  const created = new Date(transaction.created_at);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{formatCurrency(transaction.amount, transaction.currency_code)}</ThemedText>
        <Badge label={formatTransactionStatus(transaction.status)} />

        <ThemedView type="backgroundElement" style={styles.card}>
          <DetailRow label="Transaction Number" value={transaction.id} />
          <DetailRow label="Date" value={created.toLocaleDateString()} />
          <DetailRow label="Time" value={created.toLocaleTimeString()} />
          <DetailRow label="Sender" value={sender} />
          <DetailRow label="Receiver" value={receiver} />
          <DetailRow label="Amount" value={formatCurrency(transaction.amount, transaction.currency_code)} />
          <DetailRow label="Status" value={formatTransactionStatus(transaction.status)} />
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three, marginTop: Spacing.three },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
