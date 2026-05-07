import api from '@/lib/api';

export interface Conversation {
  id: string;
  type: string | number;
  name?: string;
  createdAt: string;
  participants?: { userId: string; username: string; avatar?: string; isAi?: boolean }[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount?: number;
}

export interface CreateConversationResult {
  success: boolean;
  conversation?: Conversation;
  exists: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export const messageApi = {
  async getConversations(userId: string): Promise<Conversation[]> {
    const res = await api.get<{ success: boolean; data: Conversation[] }>(`/api/messages/${userId}`);
    return res.data.data || [];
  },

  async getConversationDetail(userId: string, conversationId: string): Promise<Conversation> {
    const res = await api.get<{ success: boolean; data: Conversation }>(`/api/messages/${userId}/${conversationId}`);
    return res.data.data;
  },

  async getMessages(userId: string, conversationId: string): Promise<Message[]> {
    const res = await api.get<{ success: boolean; data: Message[] }>(`/api/messages/${userId}/${conversationId}/messages`);
    return res.data.data || [];
  },

  async sendMessage(userId: string, conversationId: string, content: string): Promise<Message> {
    const res = await api.post<{ success: boolean; data: Message }>(`/api/messages/${userId}/${conversationId}/messages`, { content });
    return res.data.data;
  },

  async createConversation(data: { type: string; participantIds: string[]; name?: string }): Promise<CreateConversationResult> {
    const res = await api.post<{ success: boolean; data: CreateConversationResult }>('/api/messages', {
      ...data,
      type: data.type === 'private' ? 1 : data.type === 'group' ? 2 : parseInt(data.type) || 1,
    });
    return res.data.data;
  },
};