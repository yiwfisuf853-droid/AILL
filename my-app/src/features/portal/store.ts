// Portal Store — 看板/广场统一状态管理
// 合并来源：square + rankings + campaigns + sections + hot-topics + home

import { create } from 'zustand';
import api from '@/lib/api';

// ── 类型定义 ──

export type SquareTab = 'sections' | 'rankings' | 'mustsee' | 'campaigns' | 'shop';

export interface SquarePostQuery {
  page?: number;
  pageSize?: number;
  sectionId?: string;
  tag?: string;
  sortBy?: 'latest' | 'hot';
}

export interface Ranking {
  id: string;
  rankType: string;
  targetType: number;
  targetId: string;
  score: number;
  rankNo: number;
  period: string;
  calculatedAt: string;
  target?: { id: string; title: string; username?: string; authorName?: string; author?: { username: string; avatar: string } } | null;
}

export interface MustSeeItem {
  id: string;
  postId: string;
  reason: string;
  sortOrder: number;
  startTime: string | null;
  endTime: string | null;
  createdBy: string;
  createdAt: string;
  post?: { id: string; title: string; coverImage: string } | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: number;
  priority: number;
  startTime: string | null;
  endTime: string | null;
  isSticky: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: number;
  startTime: string;
  endTime: string;
  rewardConfig: { target?: number; rewards?: { amount: number; assetTypeId: number }[]; [key: string]: unknown };
  status: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  condition: { description?: string; [key: string]: unknown };
  reward: { rewards?: { amount: number; assetTypeId: number }[]; [key: string]: unknown };
  createdAt: string;
}

export interface Section {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  hsl?: string;
  postCount?: number;
  sortOrder?: number;
  status: number;
}

export interface HotPost {
  id: string;
  title: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  sectionId: string;
  coverImage?: string;
}

export interface HotTopic {
  id: string;
  title: string;
  description?: string;
  heatScore: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  avatar?: string;
  isAi: boolean;
  isActive?: boolean;
}

export interface AiAction {
  id: string;
  type: 'post' | 'comment' | 'like' | 'follow' | 'favorite' | 'live';
  username: string;
  isAi: true;
  target?: string;
  createdAt: string;
}

// ── Store 状态 ──

interface PortalState {
  // Square
  activeSquareTab: SquareTab;
  squarePosts: any[];
  squarePostsTotal: number;
  squarePostsLoading: boolean;
  squarePostsQuery: SquarePostQuery;
  selectedSectionId: string;
  postsSortBy: 'latest' | 'hot';

  // Rankings
  rankings: Ranking[];
  mustSeeList: MustSeeItem[];
  announcements: Announcement[];

  // Campaigns
  campaigns: Campaign[];
  achievements: Achievement[];

  // Sections
  sections: Section[];

  // Hot Topics
  hotTopics: HotTopic[];

  // Hot Posts（合并自 homeStore）
  hotPosts: HotPost[];
  latestPosts: HotPost[];

  // Online Users & AI Actions（合并自 home/portalStore）
  onlineUsers: OnlineUser[];
  aiActions: AiAction[];

  // Stats（看板统计）
  stats: { posts: number; users: number; comments: number; activeUsers?: number; totalPosts?: number; aiPosts?: number; creators?: number };

  // Loading
  loading: boolean;

  // Actions - Square
  setActiveSquareTab: (tab: SquareTab) => void;
  setSelectedSectionId: (id: string) => void;
  setPostsSortBy: (sortBy: 'latest' | 'hot') => void;
  fetchSquarePosts: (query?: SquarePostQuery) => Promise<void>;

  // Actions - Rankings
  fetchRankings: (params?: Record<string, string>) => Promise<void>;
  fetchMustSee: (params?: Record<string, string>) => Promise<void>;
  fetchAnnouncements: (params?: Record<string, string>) => Promise<void>;

  // Actions - Campaigns
  fetchCampaigns: () => Promise<void>;

  // Actions - Sections
  fetchSections: () => Promise<void>;

  // Actions - Hot Topics
  fetchHotTopics: (page?: number, limit?: number) => Promise<void>;

  // Actions - Hot Posts
  fetchHotPosts: () => Promise<void>;

  // Actions - Stats
  fetchStats: () => Promise<void>;

  // Actions - Online Users & AI Actions
  setOnlineUsers: (users: string[] | OnlineUser[]) => void;
  updateOnlineUsers: (users: OnlineUser[]) => void;
  prependAiAction: (action: any) => void;
  isOnline: (userId: string) => boolean;

  // Favorites（合并自 favoritesStore）
  favoriteFolders: any[];
  favorites: any[];
  favoritesTotal: number;
  currentFolderId: string | null;
  favoritesLoading: boolean;
  fetchFavoriteFolders: (userId: string) => Promise<void>;
  fetchFavorites: (userId: string, params?: { folderId?: string; page?: number }) => Promise<void>;
  setCurrentFolder: (folderId: string | null) => void;
  addFavorite: (userId: string, targetType: string, targetId: string, folderId?: string) => Promise<void>;
  removeFavorite: (userId: string, targetId: string) => Promise<void>;
}

export const usePortalStore = create<PortalState>((set, get) => ({
  // Square 初始状态
  activeSquareTab: 'sections',
  squarePosts: [],
  squarePostsTotal: 0,
  squarePostsLoading: false,
  squarePostsQuery: { page: 1, pageSize: 20 },
  selectedSectionId: '',
  postsSortBy: 'hot',

  // Rankings 初始状态
  rankings: [],
  mustSeeList: [],
  announcements: [],

  // Campaigns 初始状态
  campaigns: [],
  achievements: [],

  // Sections 初始状态
  sections: [],

  // Hot Topics 初始状态
  hotTopics: [],

  // Hot Posts 初始状态
  hotPosts: [],
  latestPosts: [],

  // Online Users & AI Actions 初始状态
  onlineUsers: [],
  aiActions: [],

  // Stats 初始状态
  stats: { posts: 0, users: 0, comments: 0, activeUsers: 0, totalPosts: 0, aiPosts: 0, creators: 0 },

  loading: false,

  // ── Square Actions ──

  setActiveSquareTab: (tab) => set({ activeSquareTab: tab }),

  setSelectedSectionId: (id) => {
    set({ selectedSectionId: id });
  },

  setPostsSortBy: (sortBy) => {
    set({ postsSortBy: sortBy, squarePostsQuery: { ...get().squarePostsQuery, sortBy, page: 1 } });
    get().fetchSquarePosts({ sortBy, page: 1 });
  },

  fetchSquarePosts: async (query) => {
    set({ squarePostsLoading: true });
    try {
      const merged = { ...get().squarePostsQuery, ...query };
      const params: Record<string, any> = {
        page: merged.page,
        pageSize: merged.pageSize || 20,
        sortBy: merged.sortBy || get().postsSortBy,
      };
      if (merged.sectionId) {
        params.sectionId = merged.sectionId;
      }
      if (merged.tag) {
        params.tag = merged.tag;
      }
      const res = await api.get('/api/posts', { params });
      const payload = res.data?.data || res.data || {};
      const list = payload.list || [];
      set({
        squarePosts: merged.page === 1
          ? list
          : [...get().squarePosts, ...list],
        squarePostsTotal: payload.total || 0,
        squarePostsQuery: merged,
      });
    } catch {
      // 静默失败
    } finally {
      set({ squarePostsLoading: false });
    }
  },

  // ── Rankings Actions ──

  fetchRankings: async (params) => {
    set({ loading: true });
    try {
      const res: any = await api.get('/api/rankings', { params });
      set({ rankings: res.data?.data?.list || res.data?.list || res.data?.data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMustSee: async (params) => {
    set({ loading: true });
    try {
      const res: any = await api.get('/api/rankings/mustsee', { params });
      set({ mustSeeList: res.data?.data?.list || res.data?.list || res.data?.data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAnnouncements: async (params) => {
    set({ loading: true });
    try {
      const res: any = await api.get('/api/rankings/announcements', { params });
      set({ announcements: res.data?.data?.list || res.data?.list || res.data?.data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  // ── Campaigns Actions ──

  fetchCampaigns: async () => {
    set({ loading: true });
    try {
      const [cRes, aRes] = await Promise.all([
        api.get('/api/campaigns').catch(() => ({ data: { list: [] } })),
        api.get('/api/campaigns/achievements').catch(() => ({ data: { list: [] } })),
      ]);
      set({
        campaigns: cRes.data?.data?.list || cRes.data?.list || cRes.data?.data || [],
        achievements: aRes.data?.data?.list || aRes.data?.list || aRes.data?.data || [],
        loading: false,
      });
    } catch {
      set({ campaigns: [], achievements: [], loading: false });
    }
  },

  // ── Sections Actions ──

  fetchSections: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/sections');
      set({ sections: res.data?.list || res.data?.data || res.data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  // ── Hot Topics Actions ──

  fetchHotTopics: async (page = 1, limit = 10) => {
    set({ loading: true });
    try {
      const res = await api.get('/api/hot-topics', { params: { page, limit } });
      set({ hotTopics: res.data?.data?.list || res.data?.list || res.data?.data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  // ── Hot Posts Actions ──

  fetchHotPosts: async () => {
    try {
      const [hot, latest] = await Promise.all([
        api.get("/api/posts/hot?limit=8").catch(() => ({ data: [] })),
        api.get("/api/posts?sortBy=latest&pageSize=5").catch(() => ({ data: { list: [] } })),
      ]);
      const hotPayload = hot.data?.data || hot.data || [];
      const latestPayload = latest.data?.data || latest.data || {};
      set({
        hotPosts: Array.isArray(hotPayload) ? hotPayload : hotPayload.list || [],
        latestPosts: latestPayload.list || [],
      });
    } catch {
      // 静默失败
    }
  },

  // ── Stats Actions ──

  fetchStats: async () => {
    try {
      const res = await api.get('/api/health');
      const s = res.data?.stats || { users: 0, posts: 0, comments: 0 };
      set({
        stats: {
          posts: s.posts,
          users: s.users,
          comments: s.comments,
          activeUsers: s.users,
          totalPosts: s.posts,
          aiPosts: Math.floor(s.posts * 0.3),
          creators: Math.floor(s.users * 0.1),
        },
      });
    } catch {
      // 静默失败
    }
  },

  // ── Online Users & AI Actions ──

  setOnlineUsers: (users) => {
    set({ onlineUsers: Array.isArray(users) ? users.map((u: any) =>
      typeof u === 'string' ? { id: u, username: u, isAi: false } : u
    ) : [] });
  },

  updateOnlineUsers: (users) => {
    set({ onlineUsers: users });
  },

  prependAiAction: (action) => {
    const normalized: AiAction = {
      id: action.id || Date.now().toString(),
      type: action.type || 'post',
      username: action.username || action.aiName || 'AI',
      isAi: true,
      target: action.target || action.postTitle,
      createdAt: action.createdAt || new Date().toISOString(),
    };
    set((state) => ({
      aiActions: [normalized, ...state.aiActions].slice(0, 20),
    }));
  },

  isOnline: (userId) => get().onlineUsers.some((u) => u.id === userId),

  favoriteFolders: [],
  favorites: [],
  favoritesTotal: 0,
  currentFolderId: null,
  favoritesLoading: false,

  fetchFavoriteFolders: async (userId) => {
    try {
      const res = await api.get(`/api/favorites/${userId}/folders`);
      set({ favoriteFolders: res.data?.data?.list || res.data?.list || res.data?.data || [] });
    } catch {}
  },

  fetchFavorites: async (userId, params = {}) => {
    set({ favoritesLoading: true });
    try {
      const res = await api.get(`/api/favorites/${userId}`, {
        params: { folderId: params.folderId || get().currentFolderId || undefined, page: params.page },
      });
      const payload = res.data?.data || res.data || {};
      set({ favorites: payload.list || [], favoritesTotal: payload.total || 0 });
    } finally { set({ favoritesLoading: false }); }
  },

  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),

  addFavorite: async (userId, targetType, targetId, folderId) => {
    await api.post(`/api/favorites/${userId}`, { targetType, targetId, folderId });
  },

  removeFavorite: async (userId, targetId) => {
    await api.delete(`/api/favorites/${userId}/${targetId}`);
    set((s) => ({
      favorites: s.favorites.filter((f: any) => f.targetId !== targetId),
      favoritesTotal: Math.max(0, s.favoritesTotal - 1),
    }));
  },
}));
