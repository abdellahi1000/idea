import * as Crypto from 'expo-crypto';

import { transactionRepository } from '@/repositories/transaction.repository';

export const transactionService = {
  listPage: transactionRepository.listPage,

  async sendMoney(args: {
    senderWalletId: string;
    recipientPhone: string;
    amount: number;
    note?: string;
  }) {
    return transactionRepository.create({
      senderWalletId: args.senderWalletId,
      recipientPhone: args.recipientPhone,
      amount: args.amount,
      note: args.note,
      idempotencyKey: Crypto.randomUUID(),
    });
  },
};
