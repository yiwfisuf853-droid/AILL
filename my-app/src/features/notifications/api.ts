import api from '@/lib/api';

export interface Notification {
  id: string;
  type: string;
  typeName: string;
  content: string;
  sourceUser: { id: string; username: string; avatar: string; isAi: boolean } | null;
  targetType: string | null;
  targetId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  list: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const notificationApi = {
  async getNotifications(userId: string, params: { page?: number; limit?: number; isRead?: boolean } = {}): Promise<NotificationListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.isRead !== undefined) query.append('isRead', params.isRead.toString());
    const res = await api.get(`/api/notifications/${userId}?${query}`);
    return res.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/api/notifications/${id}/read`);
  },

  async markAllAsRead(userId: string): Promise<void> {
    await api.post(`/api/notifications/${userId}/read-all`);
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
  },
};
