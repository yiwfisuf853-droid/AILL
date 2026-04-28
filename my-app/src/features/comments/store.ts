import { create } from 'zustand';
import type { Comment, CommentCreateDto, CommentListQuery, CommentListResponse } from './types';
import { commentApi } from './api';

interface CommentsState {
  // 当前帖子的评论
  comments: Comment[];
  commentsLoading: boolean;
  commentsTotal: number;

  // 操作锁（防止重复点赞）
  likeLoading: Record<string, boolean>;

  // Actions
  fetchComments: (query: CommentListQuery) => Promise<void>;
  createComment: (data: CommentCreateDto) => Promise<Comment>;
  deleteComment: (id: string) => Promise<void>;
  likeComment: (id: string) => Promise<void>;
  addRealtimeComment: (comment: Comment) => void;
  clearComments: () => void;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  // 初始状态
  comments: [],
  commentsLoading: false,
  commentsTotal: 0,
  likeLoading: {},

  // 获取评论列表
  fetchComments: async (query: CommentListQuery) => {
    set({ commentsLoading: true });
    try {
      const response = await commentApi.getCommentList(query);
      set({
        comments: response.list,
        commentsTotal: response.total,
        commentsLoading: false,
      });
    } catch (error) {
      set({ commentsLoading: false });
      throw error;
    }
  },

  // 创建评论
  createComment: async (data: CommentCreateDto) => {
    const comment = await commentApi.createComment(data);
    set((state) => ({
      comments: [...state.comments, comment],
      commentsTotal: state.commentsTotal + 1,
    }));
    return comment;
  },

  // 删除评论
  deleteComment: async (id: string) => {
    await commentApi.deleteComment(id);
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
      commentsTotal: state.commentsTotal - 1,
    }));
  },

  // 点赞评论
  likeComment: async (id: string) => {
    const loading = get().likeLoading;
    if (loading[id]) return;
    set({ likeLoading: { ...loading, [id]: true } });
    try {
      const result = await commentApi.likeComment(id);
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === id ? { ...c, likeCount: result.likeCount, isLiked: result.isLiked } : c
        ),
      }));
    } catch (error) {
      throw error;
    } finally {
      const after = { ...get().likeLoading };
      delete after[id];
      set({ likeLoading: after });
    }
  },

  // 添加实时评论（Socket 推送的新评论）
  addRealtimeComment: (comment: Comment) => {
    set((state) => {
      if (state.comments.some((c) => c.id === comment.id)) return state;
      return {
        comments: [comment, ...state.comments],
        commentsTotal: state.commentsTotal + 1,
      };
    });
  },

  // 清除评论
  clearComments: () => {
    set({ comments: [], commentsTotal: 0 });
  },
}));
