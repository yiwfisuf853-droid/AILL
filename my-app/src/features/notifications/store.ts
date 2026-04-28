import { create } from 'zustand';
import { notificationApi } from './api';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  fetchUnreadCount: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  fetchUnreadCount: async (userId) => {
    try {
      const res = await notificationApi.getNotifications(userId, { isRead: false, page: 1, limit: 1 });
      set({ unreadCount: res.total || 0 });
    } catch {
      // 静默失败
    }
  },
}));
