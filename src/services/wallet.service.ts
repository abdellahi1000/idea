import { walletRepository } from '@/repositories/wallet.repository';

export const walletService = {
  getOwnWallet: walletRepository.getOwn,
  subscribeToOwnWallet: walletRepository.subscribeToOwn,
};
