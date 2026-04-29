import api from '@/lib/api';
import type { Post, PostCreateDto, PostUpdateDto, PostListQuery, PostListResponse } from './types';

export const postApi = {
  // 获取帖子列表
  async getPostList(query: PostListQuery): Promise<PostListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.sectionId) params.append('sectionId', query.sectionId);
    if (query.type) params.append('type', query.type);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.tag) params.append('tag', query.tag);
    if (query.authorId) params.append('authorId', query.authorId);
    if (query.keyword) params.append('keyword', query.keyword);

    const response = await api.get<PostListResponse>(`/api/posts?${params}`);
    return response.data;
  },

  // 获取热门帖子
  async getHotPosts(sectionId?: string, limit = 10): Promise<Post[]> {
    const params = new URLSearchParams();
    if (sectionId) params.append('sectionId', sectionId);
    params.append('limit', limit.toString());
    const response = await api.get<Post[]>(`/api/posts/hot?${params}`);
    return response.data;
  },

  // 获取关注用户的帖子流
  async getFollowingPosts(page = 1, pageSize = 20): Promise<PostListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    const response = await api.get<PostListResponse>(`/api/posts/following?${params}`);
    return response.data;
  },

  // 获取帖子详情
  async getPostDetail(id: string): Promise<Post> {
    const response = await api.get<Post>(`/api/posts/${id}`);
    return response.data;
  },

  // 创建帖子
  async createPost(data: PostCreateDto): Promise<Post> {
    const response = await api.post<Post>('/api/posts', data);
    return response.data;
  },

  // 更新帖子
  async updatePost(id: string, data: PostUpdateDto): Promise<Post> {
    const response = await api.put<Post>(`/api/posts/${id}`, data);
    return response.data;
  },

  // 删除帖子
  async deletePost(id: string): Promise<void> {
    await api.delete(`/api/posts/${id}`);
  },

  // 点赞帖子（后端使用 toggle 模式，同一端点切换点赞/取消点赞）
  async likePost(id: string): Promise<{ likeCount: number; isLiked: boolean }> {
    const response = await api.post(`/api/posts/${id}/like`);
    return response.data;
  },

  // 收藏帖子（后端使用 toggle 模式，同一端点切换收藏/取消收藏）
  async favoritePost(id: string): Promise<{ favoriteCount: number; isFavorite: boolean }> {
    const response = await api.post(`/api/posts/${id}/favorite`);
    return response.data;
  },

  // 分享帖子
  async sharePost(id: string): Promise<{ shareCount: number }> {
    const response = await api.post(`/api/posts/${id}/share`);
    return response.data;
  },

  // 浏览帖子（增加计数）
  async viewPost(id: string): Promise<void> {
    await api.post(`/api/posts/${id}/view`);
  },

  // 获取用户发布的帖子
  async getUserPosts(userId: string, query?: Partial<PostListQuery>): Promise<PostListResponse> {
    return this.getPostList({ ...query, authorId: userId });
  },

  // 获取用户收藏的帖子
  async getUserFavorites(userId: string, page = 1, pageSize = 20): Promise<PostListResponse> {
    const response = await api.get<PostListResponse>(`/api/favorites/${userId}/favorites`, {
      params: { page, pageSize },
    });
    return response.data;
  },
};
