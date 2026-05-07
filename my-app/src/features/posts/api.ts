import api from '@/lib/api';
import type { Post, PostCreateDto, PostUpdateDto, PostListQuery, PostListResponse, EditHistoryItem } from './types';
import { PostType, PostStatus, PostOriginalType } from './types';

// 前端字符串枚举 → 后端整数 映射
const POST_TYPE_TO_INT: Record<string, number> = {
  [PostType.ARTICLE]: 1,
  [PostType.VIDEO]: 2,
  [PostType.AUDIO]: 3,
  [PostType.QUESTION]: 4,
  [PostType.POLL]: 5,
  [PostType.LIVE]: 6,
};
const POST_STATUS_TO_INT: Record<string, number> = {
  [PostStatus.DRAFT]: 0,
  [PostStatus.PENDING_REVIEW]: 1,
  [PostStatus.PUBLISHED]: 2,
  [PostStatus.REJECTED]: 3,
};
const POST_ORIGINAL_TYPE_TO_INT: Record<string, number> = {
  [PostOriginalType.ORIGINAL]: 1,
  [PostOriginalType.RECREATE]: 2,
  [PostOriginalType.REPOST]: 3,
  [PostOriginalType.ADAPTATION]: 4,
};

function toIntType(type: string | undefined): number | undefined {
  if (!type) return undefined;
  return POST_TYPE_TO_INT[type] ?? (Number(type) || undefined);
}
function toIntStatus(status: string | number | undefined): number | undefined {
  if (status === undefined) return undefined;
  if (typeof status === 'number') return status;
  return POST_STATUS_TO_INT[status] ?? (Number(status) || undefined);
}
function toIntOriginalType(type: string | undefined): number | undefined {
  if (!type) return undefined;
  return POST_ORIGINAL_TYPE_TO_INT[type] ?? (Number(type) || undefined);
}

export const postApi = {
  // 获取帖子列表
  async getPostList(query: PostListQuery): Promise<PostListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.sectionId) params.append('sectionId', query.sectionId);
    if (query.type) params.append('type', String(toIntType(query.type)));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.tag) params.append('tag', query.tag);
    if (query.authorId) params.append('authorId', query.authorId);
    if (query.keyword) params.append('keyword', query.keyword);

    const response = await api.get<{ success: boolean; data: PostListResponse }>(`/api/posts?${params}`);
    return response.data.data;
  },

  // 获取热门帖子
  async getHotPosts(sectionId?: string, limit = 10): Promise<Post[]> {
    const params = new URLSearchParams();
    if (sectionId) params.append('sectionId', sectionId);
    params.append('limit', limit.toString());
    const response = await api.get<{ success: boolean; data: Post[] }>(`/api/posts/hot?${params}`);
    return response.data.data || [];
  },

  // 获取关注用户的帖子流
  async getFollowingPosts(page = 1, pageSize = 20): Promise<PostListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    const response = await api.get<{ success: boolean; data: PostListResponse }>(`/api/posts/following?${params}`);
    return response.data.data;
  },

  // 获取帖子详情
  async getPostDetail(id: string): Promise<Post> {
    const response = await api.get<{ success: boolean; data: Post }>(`/api/posts/${id}`);
    return response.data.data;
  },

  // 创建帖子
  async createPost(data: PostCreateDto): Promise<Post> {
    const payload = {
      ...data,
      type: toIntType(data.type),
      originalType: toIntOriginalType(data.originalType),
    };
    const response = await api.post<{ success: boolean; data: Post }>('/api/posts', payload);
    return response.data.data;
  },

  // 更新帖子
  async updatePost(id: string, data: PostUpdateDto): Promise<Post> {
    const payload = { ...data };
    if (data.type) (payload as any).type = toIntType(data.type);
    if (data.status !== undefined) (payload as any).status = toIntStatus(data.status);
    const response = await api.put<{ success: boolean; data: Post }>(`/api/posts/${id}`, payload);
    return response.data.data;
  },

  // 删除帖子
  async deletePost(id: string): Promise<void> {
    await api.delete(`/api/posts/${id}`);
  },

  // 点赞帖子（后端使用 toggle 模式，同一端点切换点赞/取消点赞）
  async likePost(id: string): Promise<{ likeCount: number; isLiked: boolean }> {
    const response = await api.post<{ success: boolean; data: { likeCount: number; isLiked: boolean } }>(`/api/posts/${id}/like`);
    return response.data.data;
  },

  // 收藏帖子（后端使用 toggle 模式，同一端点切换收藏/取消收藏）
  async favoritePost(id: string): Promise<{ favoriteCount: number; isFavorite: boolean }> {
    const response = await api.post<{ success: boolean; data: { favoriteCount: number; isFavorite: boolean } }>(`/api/posts/${id}/favorite`);
    return response.data.data;
  },

  // 分享帖子
  async sharePost(id: string): Promise<{ shareCount: number }> {
    const response = await api.post<{ success: boolean; data: { shareCount: number } }>(`/api/posts/${id}/share`);
    return response.data.data;
  },

  // 浏览帖子（增加计数）
  async viewPost(id: string, duration?: number): Promise<void> {
    const params = duration ? { duration } : undefined;
    await api.post(`/api/posts/${id}/view`, null, { params });
  },

  // 获取用户发布的帖子
  async getUserPosts(userId: string, query?: Partial<PostListQuery>): Promise<PostListResponse> {
    return this.getPostList({ ...query, authorId: userId });
  },

  // 获取用户收藏的帖子
  async getUserFavorites(userId: string, page = 1, pageSize = 20): Promise<PostListResponse> {
    const response = await api.get<{ success: boolean; data: PostListResponse }>(`/api/favorites/${userId}/favorites`, {
      params: { page, pageSize },
    });
    return response.data.data;
  },

  // 获取帖子编辑历史
  async getEditHistory(postId: string, page = 1, limit = 10): Promise<{ list: EditHistoryItem[]; total: number }> {
    const response = await api.get<{ success: boolean; data: { list: EditHistoryItem[]; total: number } }>(`/api/posts/${postId}/history?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  // 获取用户的草稿列表
  async getUserDrafts(userId: string, query?: Partial<PostListQuery>): Promise<PostListResponse> {
    return this.getPostList({ ...query, authorId: userId, status: 0 as any });
  },
};
