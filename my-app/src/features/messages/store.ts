import { create } from 'zustand';
import { notificationApi, type Notification } from '@/features/notifications/api';

interface Conversation {
  id: string;
  type: string;
  name?: string;
  participants: any[];
  lastMessage?: any;
  unreadCount?: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface MessageState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  unreadTotal: number;

  // 通知相关（合并自 notificationsStore）
  unreadNotificationCount: number;
  latestNotifications: Notification[];

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setUnreadTotal: (count: number) => void;
  incrementUnread: () => void;

  // 通知 Actions（合并自 notificationsStore）
  setUnreadNotificationCount: (count: number) => void;
  incrementUnreadNotification: () => void;
  prependNotification: (n: Notification) => void;
  fetchUnreadNotificationCount: (userId: string) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  unreadTotal: 0,

  // 通知初始状态
  unreadNotificationCount: 0,
  latestNotifications: [],

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setUnreadTotal: (count) => set({ unreadTotal: count }),
  incrementUnread: () => set((s) => ({ unreadTotal: s.unreadTotal + 1 })),

  // 通知 Actions
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  incrementUnreadNotification: () => set((s) => ({ unreadNotificationCount: s.unreadNotificationCount + 1 })),
  prependNotification: (n) =>
    set((s) => ({
      latestNotifications: [n, ...s.latestNotifications].slice(0, 20),
    })),
  fetchUnreadNotificationCount: async (userId) => {
    try {
      const res = await notificationApi.getNotifications(userId, { isRead: false, page: 1, limit: 1 });
      set({ unreadNotificationCount: res.total || 0 });
    } catch {
      // 静默失败
    }
  },
}));

// 向后兼容别名：notificationStore 的功能现在由 messageStore 提供
export const useNotificationStore = useMessageStore;
