import { create } from 'zustand';

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
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setUnreadTotal: (count: number) => void;
  incrementUnread: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  unreadTotal: 0,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setUnreadTotal: (count) => set({ unreadTotal: count }),
  incrementUnread: () => set((s) => ({ unreadTotal: s.unreadTotal + 1 })),
}));
