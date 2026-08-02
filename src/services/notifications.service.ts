import { notificationRepository } from '@/repositories/notification.repository';

export const notificationsService = {
  listOwn: notificationRepository.listOwn,
  markRead: notificationRepository.markRead,
  subscribeToOwn: notificationRepository.subscribeToOwn,
};
