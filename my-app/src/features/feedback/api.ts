import api from '@/lib/api';

export interface Feedback {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
}

export const feedbackApi = {
  async createFeedback(data: { type: string; title: string; content: string }): Promise<Feedback> {
    const res = await api.post<{ success: boolean; data: Feedback }>('/api/feedback', data);
    return res.data.data;
  },

  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    const res = await api.get<{ success: boolean; data: Feedback[] }>(`/api/feedback/user/${userId}`);
    return res.data.data || [];
  },
};