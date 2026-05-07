import { create } from 'zustand';
import { squareApi } from './api';
import type { SquareTab, SquarePostQuery } from './types';

interface SquareState {
  // Tab 状态
  activeTab: SquareTab;
  setActiveTab: (tab: SquareTab) => void;

  // 帖子列表
  posts: any[];
  postsTotal: number;
  postsLoading: boolean;
  postsQuery: SquarePostQuery;

  // 筛选
  selectedSectionId: string;
  postsSortBy: 'latest' | 'hot';

  // Actions
  setSelectedSectionId: (id: string) => void;
  setPostsSortBy: (sortBy: 'latest' | 'hot') => void;
  fetchPosts: (query?: SquarePostQuery) => Promise<void>;
  refreshPosts: () => Promise<void>;
}

export const useSquareStore = create<SquareState>((set, get) => ({
  activeTab: 'sections',
  posts: [],
  postsTotal: 0,
  postsLoading: false,
  postsQuery: { page: 1, pageSize: 20 },
  selectedSectionId: '',
  postsSortBy: 'hot',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedSectionId: (id) => {
    set({ selectedSectionId: id, postsQuery: { ...get().postsQuery, page: 1 } });
    get().fetchPosts({ sectionId: id, page: 1 });
  },

  setPostsSortBy: (sortBy) => {
    set({ postsSortBy: sortBy, postsQuery: { ...get().postsQuery, page: 1 } });
    get().fetchPosts({ sortBy, page: 1 });
  },

  fetchPosts: async (query) => {
    set({ postsLoading: true });
    try {
      const merged = { ...get().postsQuery, ...query };
      const res = await squareApi.fetchPosts({
        page: merged.page,
        pageSize: merged.pageSize || 20,
        sectionId: merged.sectionId || get().selectedSectionId || undefined,
        sortBy: merged.sortBy || get().postsSortBy,
      });
      set({
        posts: merged.page === 1
          ? (res.list || [])
          : [...get().posts, ...(res.list || [])],
        postsTotal: res.total || 0,
        postsQuery: merged,
      });
    } catch {
      // 静默失败
    } finally {
      set({ postsLoading: false });
    }
  },

  refreshPosts: async () => {
    await get().fetchPosts({ page: 1 });
  },
}));
