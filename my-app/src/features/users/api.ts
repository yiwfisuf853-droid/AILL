import api from '@/lib/api';
import type {
  UserProfile,
  UserPostsResponse,
  FollowResult,
  RelationshipListResponse,
  UserAssets,
  AiProfile,
  AssetTransaction,
} from './types';

export const userApi = {
  /** 获取用户信息 */
  async getUser(id: string): Promise<UserProfile> {
    const res = await api.get<{ success: boolean; data: UserProfile }>(`/api/users/${id}`);
    return res.data.data;
  },

  /** 更新用户资料 */
  async updateProfile(id: string, data: { username?: string; email?: string; avatar?: string; bio?: string }): Promise<UserProfile> {
    const res = await api.put<{ success: boolean; data: UserProfile }>(`/api/users/${id}`, data);
    return res.data.data;
  },

  /** 修改密码 */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const res = await api.put<{ success: boolean; data: { success: boolean } }>('/api/auth/password', { oldPassword, newPassword });
    return res.data.data;
  },

  /** 获取用户帖子列表 */
  async getUserPosts(id: string, params: { page?: number; pageSize?: number } = {}): Promise<UserPostsResponse> {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: UserPostsResponse }>(`/api/users/${id}/posts?${query}`);
    return res.data.data;
  },

  /** 关注 / 取关用户 */
  async toggleFollow(id: string): Promise<FollowResult> {
    const res = await api.post<{ success: boolean; data: FollowResult }>(`/api/users/${id}/follow`);
    return res.data.data;
  },

  /** 检查关系状态 */
  async checkRelationship(userId: string, targetUserId: string): Promise<{ isFollowing: boolean; isFollower: boolean; isBlocked: boolean; isMutual: boolean }> {
    const res = await api.get<{ success: boolean; data: { isFollowing: boolean; isFollower: boolean; isBlocked: boolean; isMutual: boolean } }>(`/api/relationships/${userId}/relationship/${targetUserId}`);
    return res.data.data;
  },

  /** 获取粉丝列表 */
  async getFollowers(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<RelationshipListResponse> {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: RelationshipListResponse }>(`/api/relationships/${userId}/followers?${query}`);
    return res.data.data;
  },

  /** 获取关注列表 */
  async getFollowing(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<RelationshipListResponse> {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: RelationshipListResponse }>(`/api/relationships/${userId}/following?${query}`);
    return res.data.data;
  },

  /** 获取用户资产 */
  async getUserAssets(userId: string): Promise<UserAssets> {
    const res = await api.get<{ success: boolean; data: UserAssets }>(`/api/assets/${userId}`);
    return res.data.data;
  },

  /** 获取 AI 档案（仅 AI 用户） */
  async getAiProfile(userId: string): Promise<AiProfile> {
    const res = await api.get<{ success: boolean; data: AiProfile }>(`/api/ai/profiles/${userId}`);
    return res.data.data;
  },

  /** 拉黑用户 */
  async blockUser(targetUserId: string): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/relationships/block/${targetUserId}`);
    return res.data.data;
  },

  /** 取消拉黑 */
  async unblockUser(targetUserId: string): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/relationships/unblock/${targetUserId}`);
    return res.data.data;
  },

  /** 获取黑名单列表 */
  async getBlockedUsers(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<RelationshipListResponse> {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: RelationshipListResponse }>(`/api/relationships/${userId}/blocks?${query}`);
    return res.data.data;
  },

  /** 获取资产交易记录 */
  async getAssetTransactions(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<{ list: AssetTransaction[]; total: number; page: number; hasMore: boolean }> {
    const query = new URLSearchParams(params as any).toString();
    const res = await api.get<{ success: boolean; data: { list: AssetTransaction[]; total: number; page: number; hasMore: boolean } }>(`/api/assets/${userId}/transactions?${query}`);
    return res.data.data;
  },
};