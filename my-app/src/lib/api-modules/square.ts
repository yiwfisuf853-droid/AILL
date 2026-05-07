/**
 * Square 域 API 封装
 * 整合广场页相关调用：信息流、热门话题、必看内容、投票
 */
import api from '@/lib/api';
import type { PaginatedResponse, PaginationParams, SortParams } from '@/types/api';
import type { Post, PostListResponse } from '@/features/posts/types';
import type { HotTopic } from '@/features/hot-topics/types';
import type { MustSeeItem } from '@/features/portal/store';

/** 广场信息流查询参数 */
export interface SquareFeedParams extends PaginationParams, SortParams {
  sectionId?: string;
  tab?: 'sections' | 'rankings' | 'mustsee' | 'campaigns' | 'shop';
}

export const squareApi = {
  /** 获取广场信息流 */
  async getFeed(params: SquareFeedParams): Promise<PostListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.sectionId) query.append('sectionId', params.sectionId);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    const response = await api.get<{ success: boolean; data: PostListResponse }>(`/api/posts?${query}`);
    return response.data.data;
  },

  /** 获取热门话题 */
  async getHotTopics(limit?: number): Promise<{ list: HotTopic[]; total: number }> {
    const params = new URLSearchParams();
    params.append('status', '1');
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: { list: HotTopic[]; total: number } }>(`/api/hot-topics?${params}`);
    return response.data.data;
  },

  /** 获取必看内容 */
  async getMustSee(params?: PaginationParams): Promise<MustSeeItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: MustSeeItem[] }>(`/api/rankings/must-see?${query}`);
    return response.data.data || [];
  },

  /** 获取投票列表 */
  async getPolls(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const response = await api.get<{ success: boolean; data: PaginatedResponse<any> }>(`/api/polls?${query}`);
    return response.data.data;
  },

  /** 获取热门帖子（广场侧边栏用） */
  async getHotPosts(limit?: number): Promise<Post[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: Post[] }>(`/api/posts/hot?${params}`);
    return response.data.data || [];
  },
};
