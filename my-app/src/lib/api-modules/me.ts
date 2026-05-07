/**
 * Me 域 API 封装
 * 整合"我的"页相关调用：资料、帖子、收藏、订阅、粉丝、关注
 */
import api from '@/lib/api';
import type { PaginatedResponse, PaginationParams } from '@/types/api';
import type { UserProfile, UserPostsResponse, RelationshipListResponse } from '@/features/users/types';
import type { PostListResponse } from '@/features/posts/types';
import type { FavoriteListResponse, FavoriteFolder } from '@/features/favorites/types';
import type { SubscriptionListResponse, Subscription } from '@/features/subscriptions/types';

/** 当前用户扩展资料（包含 MeProfile 额外字段） */
export interface MeProfileData extends UserProfile {
  influenceScore?: number;
  trustLevel?: number;
  trustLevelName?: string;
  points?: number;
  assetCount?: number;
}

export const meApi = {
  /** 获取当前用户资料 */
  async getProfile(): Promise<MeProfileData> {
    const response = await api.get<{ success: boolean; data: MeProfileData }>('/api/auth/me');
    return response.data.data;
  },

  /** 获取我的帖子 */
  async getMyPosts(params?: PaginationParams): Promise<UserPostsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: UserPostsResponse }>(`/api/users/me/posts?${query}`);
    return response.data.data;
  },

  /** 获取收藏列表 */
  async getFavorites(params?: PaginationParams): Promise<FavoriteListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: FavoriteListResponse }>(`/api/favorites/me/favorites?${query}`);
    return response.data.data;
  },

  /** 获取收藏夹列表 */
  async getFavoriteFolders(): Promise<FavoriteFolder[]> {
    const response = await api.get<{ success: boolean; data: { list: FavoriteFolder[] } }>('/api/favorites/me/folders');
    return response.data.data.list || [];
  },

  /** 获取订阅列表 */
  async getSubscriptions(params?: PaginationParams & { type?: string; status?: string }): Promise<SubscriptionListResponse> {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: SubscriptionListResponse }>(`/api/subscriptions?${query}`);
    return response.data.data;
  },

  /** 获取粉丝列表 */
  async getFollowers(params?: PaginationParams): Promise<RelationshipListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: RelationshipListResponse }>(`/api/relationships/me/followers?${query}`);
    return response.data.data;
  },

  /** 获取关注列表 */
  async getFollowing(params?: PaginationParams): Promise<RelationshipListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: RelationshipListResponse }>(`/api/relationships/me/following?${query}`);
    return response.data.data;
  },

  /** 获取 AI 帖子订阅流 */
  async getAiPostFeed(params?: PaginationParams): Promise<{ list: any[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: { list: any[]; total: number; page: number; pageSize: number; hasMore: boolean } }>(`/api/subscriptions/ai-posts?${query}`);
    return response.data.data;
  },
};
