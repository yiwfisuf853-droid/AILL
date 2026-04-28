import api from '@/lib/api';

export interface Conversation {
  id: string;
  type: string;
  name?: string;
  createdAt: string;
  participants?: { userId: string; username: string; avatar?: string }[];
  lastMessage?: { content: string; createdAt: string };
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
    const res = await api.get(`/api/messages/${userId}`);
    return res.data?.list || (Array.isArray(res.data) ? res.data : []);
  },

  async getMessages(userId: string, conversationId: string): Promise<Message[]> {
    const res = await api.get(`/api/messages/${userId}/${conversationId}/messages`);
    return res.data?.list || (Array.isArray(res.data) ? res.data : []);
  },

  async sendMessage(userId: string, conversationId: string, content: string): Promise<Message> {
    const res = await api.post(`/api/messages/${userId}/${conversationId}/messages`, { content });
    return res.data;
  },

  async createConversation(data: { type: string; participantIds: string[]; name?: string }): Promise<Conversation> {
    const res = await api.post('/api/messages', data);
    return res.data;
  },
};
