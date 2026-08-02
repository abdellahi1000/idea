import type { Transaction } from '@/models/transaction.model';

export function formatTransactionStatus(status: Transaction['status']): string {
  switch (status) {
    case 'completed':
      return 'Successful';
    case 'failed':
    case 'reversed':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending';
  }
}
