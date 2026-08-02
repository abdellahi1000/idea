import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Transaction } from '@/models/transaction.model';
import { formatCurrency } from '@/utilities/currency';

type Props = { transaction: Transaction };

export function TransactionRow({ transaction }: Props) {
  const isSent = transaction.direction === 'sent';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } })}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.info}>
          <ThemedText type="smallBold">{isSent ? 'Sent' : 'Received'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {transaction.counterparty_name ?? 'Unknown'}
          </ThemedText>
        </View>
        <View style={styles.amountColumn}>
          <ThemedText type="smallBold">
            {isSent ? '-' : '+'}
            {formatCurrency(transaction.amount, transaction.currency_code)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {new Date(transaction.created_at).toLocaleDateString()}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  info: { gap: Spacing.half },
  amountColumn: { alignItems: 'flex-end', gap: Spacing.half },
});
