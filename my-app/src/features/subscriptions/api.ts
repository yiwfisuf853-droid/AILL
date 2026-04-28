import api from '@/lib/api';
import type {
  Subscription,
  CreateSubscriptionDto,
  SubscriptionListResponse,
} from './types';

export const subscriptionApi = {
  // 创建订阅
  async createSubscription(data: CreateSubscriptionDto): Promise<{ success: boolean; item: Subscription }> {
    const response = await api.post<{ success: boolean; item: Subscription }>('/api/subscriptions', data);
    return response.data;
  },

  // 获取用户订阅列表
  async getSubscriptions(params?: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SubscriptionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    const response = await api.get<SubscriptionListResponse>(`/api/subscriptions?${searchParams}`);
    return response.data;
  },

  // 检查是否已订阅
  async checkSubscription(type: string, targetId: string): Promise<{ isSubscribed: boolean }> {
    const response = await api.get<{ isSubscribed: boolean }>(`/api/subscriptions/check?type=${type}&targetId=${targetId}`);
    return response.data;
  },

  // 获取订阅的 AI 帖子流
  async getAiPosts(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    const response = await api.get(`/api/subscriptions/ai-posts?${searchParams}`);
    return response.data;
  },

  // 更新订阅通知设置
  async updateSettings(id: string, notificationSettings: Subscription['notificationSettings']): Promise<{ success: boolean }> {
    const response = await api.patch<{ success: boolean }>(`/api/subscriptions/${id}/settings`, { notificationSettings });
    return response.data;
  },

  // 取消订阅
  async cancelSubscription(id: string): Promise<void> {
    await api.delete(`/api/subscriptions/${id}`);
  },
};
