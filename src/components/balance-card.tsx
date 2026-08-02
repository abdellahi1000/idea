import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/utilities/currency';

type Props = {
  balance: number;
  currencyCode: string;
  accountIdentifier: string;
  lastUpdatedAt: string;
};

export function BalanceCard({ balance, currencyCode, accountIdentifier, lastUpdatedAt }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.primary }]}>
      <ThemedText type="small" style={styles.label}>
        Current Balance
      </ThemedText>
      <ThemedText type="title" style={styles.balance}>
        {formatCurrency(balance, currencyCode)}
      </ThemedText>

      <View style={styles.row}>
        <ThemedText type="small" style={styles.label}>
          Account Number
        </ThemedText>
        <ThemedText type="smallBold" style={styles.value}>
          {accountIdentifier}
        </ThemedText>
      </View>

      <ThemedText type="small" style={styles.updated}>
        Last updated {new Date(lastUpdatedAt).toLocaleString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { color: 'rgba(255,255,255,0.8)' },
  balance: { color: '#ffffff' },
  value: { color: '#ffffff' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
  },
  updated: { color: 'rgba(255,255,255,0.7)', marginTop: Spacing.one },
});
