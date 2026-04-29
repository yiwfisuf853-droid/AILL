import { create } from 'zustand';
import type { Post, PostCreateDto, PostUpdateDto, PostListQuery, PostListResponse } from './types';
import { postApi } from './api';

interface PostsState {
  // 列表数据
  postList: Post[];
  postListLoading: boolean;
  postListTotal: number;
  postListQuery: PostListQuery;

  // 当前帖子
  currentPost: Post | null;
  currentPostLoading: boolean;

  // 热门帖子
  hotPosts: Post[];
  hotPostsLoading: boolean;

  // 操作锁（防止重复点击）
  actionLoading: Record<string, boolean>;

  // Actions - 列表
  fetchPostList: (query?: PostListQuery) => Promise<void>;
  refreshPostList: () => Promise<void>;
  resetPostList: () => void;

  // Actions - 详情
  fetchPostDetail: (id: string) => Promise<void>;
  clearCurrentPost: () => void;

  // Actions - 热门
  fetchHotPosts: (sectionId?: string) => Promise<void>;

  // Actions - 操作
  likePost: (id: string) => Promise<void>;
  favoritePost: (id: string) => Promise<void>;
  sharePost: (id: string) => Promise<void>;

  // Actions - CRUD
  createPost: (data: PostCreateDto) => Promise<Post>;
  updatePost: (id: string, data: PostUpdateDto) => Promise<Post>;
  deletePost: (id: string) => Promise<void>;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  // 初始状态
  postList: [],
  postListLoading: false,
  postListTotal: 0,
  postListQuery: { page: 1, pageSize: 20, sortBy: 'hot' },

  currentPost: null,
  currentPostLoading: false,

  hotPosts: [],
  hotPostsLoading: false,

  actionLoading: {},

  // 获取帖子列表
  fetchPostList: async (query?: PostListQuery) => {
    set({ postListLoading: true });
    try {
      const mergedQuery = { ...get().postListQuery, ...query };
      const response = await postApi.getPostList(mergedQuery);
      set({
        postList: query?.page === 1 ? response.list : [...get().postList, ...response.list],
        postListTotal: response.total,
        postListQuery: mergedQuery,
        postListLoading: false,
      });
    } catch (error) {
      set({ postListLoading: false });
      throw error;
    }
  },

  // 刷新列表
  refreshPostList: async () => {
    await get().fetchPostList({ page: 1 });
  },

  // 重置列表（清除旧数据避免闪现）
  resetPostList: () => {
    set({ postList: [], postListTotal: 0 });
  },

  // 获取帖子详情
  fetchPostDetail: async (id: string) => {
    set({ currentPostLoading: true });
    try {
      const post = await postApi.getPostDetail(id);
      set({ currentPost: post, currentPostLoading: false });
    } catch (error) {
      set({ currentPostLoading: false });
      throw error;
    }
  },

  // 清除当前帖子
  clearCurrentPost: () => {
    set({ currentPost: null, currentPostLoading: false });
  },

  // 获取热门帖子
  fetchHotPosts: async (sectionId) => {
    set({ hotPostsLoading: true });
    try {
      const posts = await postApi.getHotPosts(sectionId);
      set({ hotPosts: posts, hotPostsLoading: false });
    } catch (error) {
      set({ hotPostsLoading: false });
      throw error;
    }
  },

  // 点赞帖子
  likePost: async (id: string) => {
    const loading = get().actionLoading;
    if (loading[`like-${id}`]) return;
    set({ actionLoading: { ...loading, [`like-${id}`]: true } });
    try {
      const result = await postApi.likePost(id);
      set((state) => ({
        postList: state.postList.map((post) =>
          post.id === id ? { ...post, likeCount: result.likeCount, isLiked: result.isLiked } : post
        ),
        currentPost: state.currentPost?.id === id
          ? { ...state.currentPost, likeCount: result.likeCount, isLiked: result.isLiked }
          : state.currentPost,
      }));
    } catch (error) {
      throw error;
    } finally {
      const after = { ...get().actionLoading };
      delete after[`like-${id}`];
      set({ actionLoading: after });
    }
  },

  // 收藏帖子
  favoritePost: async (id: string) => {
    const loading = get().actionLoading;
    if (loading[`fav-${id}`]) return;
    set({ actionLoading: { ...loading, [`fav-${id}`]: true } });
    try {
      const result = await postApi.favoritePost(id);
      set((state) => ({
        postList: state.postList.map((post) =>
          post.id === id ? { ...post, favoriteCount: result.favoriteCount, isFavorited: result.isFavorite } : post
        ),
        currentPost: state.currentPost?.id === id
          ? { ...state.currentPost, favoriteCount: result.favoriteCount, isFavorited: result.isFavorite }
          : state.currentPost,
      }));
    } catch (error) {
      throw error;
    } finally {
      const after = { ...get().actionLoading };
      delete after[`fav-${id}`];
      set({ actionLoading: after });
    }
  },

  // 分享帖子
  sharePost: async (id: string) => {
    try {
      const result = await postApi.sharePost(id);
      set((state) => ({
        postList: state.postList.map((post) =>
          post.id === id ? { ...post, shareCount: result.shareCount } : post
        ),
        currentPost: state.currentPost?.id === id
          ? { ...state.currentPost, shareCount: result.shareCount }
          : state.currentPost,
      }));
    } catch (error) {
      throw error;
    }
  },

  // 创建帖子
  createPost: async (data: PostCreateDto) => {
    const post = await postApi.createPost(data);
    // 刷新列表
    get().refreshPostList();
    return post;
  },

  // 更新帖子
  updatePost: async (id: string, data: PostUpdateDto) => {
    const post = await postApi.updatePost(id, data);
    // 更新当前帖子
    set({ currentPost: post });
    // 刷新列表
    get().refreshPostList();
    return post;
  },

  // 删除帖子
  deletePost: async (id: string) => {
    await postApi.deletePost(id);
    // 从列表中移除
    set((state) => ({
      postList: state.postList.filter((post) => post.id !== id),
      postListTotal: state.postListTotal - 1,
    }));
    // 如果当前查看的是这个帖子，清除
    if (get().currentPost?.id === id) {
      get().clearCurrentPost();
    }
  },
}));
