/**
 * Portal 域 API 封装
 * 整合看板页相关调用：统计、热门帖子、在线用户、排行榜、活动、分区
 */
import api from '@/lib/api';
import type {
  PortalStats,
  PortalTrendingPost,
  PortalAiAction,
  PaginatedResponse,
  PaginationParams,
} from '@/types/api';
import type { Post } from '@/features/posts/types';
import type { Section } from '@/features/sections/types';
import type { HotTopic } from '@/features/hot-topics/types';
import type { Ranking, MustSeeItem, Campaign, OnlineUser, AiAction } from '@/features/portal/store';
import type { CampaignListQuery } from '@/features/campaigns/types';

export const portalApi = {
  /** 获取看板统计数据 */
  async getStats(): Promise<PortalStats> {
    const response = await api.get<{ success: boolean; data: { stats: PortalStats } }>('/api/health');
    return response.data.data.stats;
  },

  /** 获取热门帖子 */
  async getTrending(limit?: number): Promise<PortalTrendingPost[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: Post[] }>(`/api/posts/hot?${params}`);
    return (response.data.data || []).map((p): PortalTrendingPost => ({
      id: p.id,
      title: p.title,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt,
    }));
  },

  /** 获取 AI 动态 */
  async getAiActions(limit?: number): Promise<AiAction[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: AiAction[] }>(`/api/ai/actions?${params}`);
    return response.data.data || [];
  },

  /** 获取在线用户 */
  async getOnlineUsers(limit?: number): Promise<OnlineUser[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: OnlineUser[] }>(`/api/online?${params}`);
    return response.data.data || [];
  },

  /** 获取排行榜 */
  async getRankings(params?: Record<string, string>): Promise<Ranking[]> {
    const query = params ? new URLSearchParams(params).toString() : '';
    const response = await api.get<{ success: boolean; data: Ranking[] }>(`/api/rankings/rankings?${query}`);
    return response.data.data || [];
  },

  /** 获取活动列表 */
  async getCampaigns(params?: CampaignListQuery): Promise<Campaign[]> {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await api.get<{ success: boolean; data: Campaign[] }>(`/api/campaigns?${query}`);
    return response.data.data || [];
  },

  /** 获取分区列表 */
  async getSections(): Promise<Section[]> {
    const response = await api.get<{ success: boolean; data: Section[] }>('/api/sections');
    return response.data.data || [];
  },

  /** 获取必看内容 */
  async getMustSee(params?: Record<string, string>): Promise<MustSeeItem[]> {
    const query = params ? new URLSearchParams(params).toString() : '';
    const response = await api.get<{ success: boolean; data: MustSeeItem[] }>(`/api/rankings/must-see?${query}`);
    return response.data.data || [];
  },

  /** 获取热门帖子（简化版，直接返回 Post） */
  async getHotPosts(limit?: number): Promise<Post[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: Post[] }>(`/api/posts/hot?${params}`);
    return response.data.data || [];
  },

  /** 获取热门话题 */
  async getHotTopics(page?: number, limit?: number): Promise<{ list: HotTopic[]; total: number }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    params.append('status', '1');
    const response = await api.get<{ success: boolean; data: { list: HotTopic[]; total: number } }>(`/api/hot-topics?${params}`);
    return response.data.data;
  },
};
