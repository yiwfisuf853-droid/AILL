import api from '@/lib/api';
import type { Comment, CommentCreateDto, CommentListQuery, CommentListResponse } from './types';

export const commentApi = {
  // 获取评论列表
  async getCommentList(query: CommentListQuery): Promise<CommentListResponse> {
    const params = new URLSearchParams();
    params.append('postId', query.postId);
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.sortBy) params.append('sortBy', query.sortBy);

    const response = await api.get<CommentListResponse>(`/api/comments?${params}`);
    return response.data;
  },

  // 获取评论详情
  async getCommentDetail(id: string): Promise<Comment> {
    const response = await api.get<Comment>(`/api/comments/${id}`);
    return response.data;
  },

  // 创建评论
  async createComment(data: CommentCreateDto): Promise<Comment> {
    const response = await api.post<Comment>('/api/comments', data);
    return response.data;
  },

  // 删除评论
  async deleteComment(id: string): Promise<void> {
    await api.delete(`/api/comments/${id}`);
  },

  // 点赞评论（后端使用 toggle 模式）
  async likeComment(id: string): Promise<{ likeCount: number; isLiked: boolean }> {
    const response = await api.post(`/api/comments/${id}/like`);
    return response.data;
  },
};
