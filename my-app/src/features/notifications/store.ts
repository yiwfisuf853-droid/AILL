import { create } from 'zustand';
import { notificationApi, type Notification } from './api';

interface NotificationState {
  unreadCount: number;
  latestNotifications: Notification[];
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  prependNotification: (n: Notification) => void;
  fetchUnreadCount: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  latestNotifications: [],
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  prependNotification: (n) =>
    set((s) => ({
      latestNotifications: [n, ...s.latestNotifications].slice(0, 20),
    })),
  fetchUnreadCount: async (userId) => {
    try {
      const res = await notificationApi.getNotifications(userId, { isRead: false, page: 1, limit: 1 });
      set({ unreadCount: res.total || 0 });
    } catch {
      // 静默失败
    }
  },
}));
