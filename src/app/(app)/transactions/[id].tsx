import { useLocalSearchParams } from 'expo-router';

import { TransactionDetailScreen } from '@/features/transactions/screens/transaction-detail-screen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionDetailScreen transactionId={id} />;
}
