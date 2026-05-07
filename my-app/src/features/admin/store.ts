import { create } from 'zustand';
import { adminApi } from './api';
import type { AdminUser, ModerationRecord, AdminStats, AdminUserDetail, AdminUserPostList, InfluenceDetail, ActionTraceList } from './types';

interface AdminState {
  users: AdminUser[];
  moderationRecords: ModerationRecord[];
  stats: AdminStats;
  usersTotal: number;
  moderationTotal: number;
  loading: boolean;
  // 用户详情
  userDetail: AdminUserDetail | null;
  userDetailLoading: boolean;
  userPosts: AdminUserPostList | null;
  userPostsLoading: boolean;
  userInfluence: InfluenceDetail | null;
  userInfluenceLoading: boolean;
  userActionTraces: ActionTraceList | null;
  userActionTracesLoading: boolean;
  fetchUsers: (params?: { search?: string; page?: number; pageSize?: number }) => Promise<void>;
  fetchModerationRecords: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchUserDetail: (id: string) => Promise<void>;
  fetchUserPosts: (id: string, page?: number, pageSize?: number) => Promise<void>;
  fetchUserInfluence: (id: string) => Promise<void>;
  fetchUserActionTraces: (userId: string, params?: { page?: number; limit?: number }) => Promise<void>;
  clearUserDetail: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  moderationRecords: [],
  stats: { users: 0, posts: 0, comments: 0, activeUsers: 0, pendingModeration: 0 },
  usersTotal: 0,
  moderationTotal: 0,
  loading: false,
  // 用户详情
  userDetail: null,
  userDetailLoading: false,
  userPosts: null,
  userPostsLoading: false,
  userInfluence: null,
  userInfluenceLoading: false,
  userActionTraces: null,
  userActionTracesLoading: false,

  fetchUsers: async (params) => {
    set({ loading: true });
    try {
      const res = await adminApi.listUsers(params);
      const data = res as any;
      set({ users: Array.isArray(data) ? data : data?.list || [], usersTotal: data?.total || 0 });
    } finally {
      set({ loading: false });
    }
  },

  fetchModerationRecords: async (params) => {
    set({ loading: true });
    try {
      const res = await adminApi.getModerationRecords(params);
      const data = res as any;
      set({ moderationRecords: Array.isArray(data) ? data : data?.list || [], moderationTotal: data?.total || 0 });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await adminApi.getStats();
      set({ stats });
    } catch {
      // 忽略
    }
  },

  fetchUserDetail: async (id) => {
    set({ userDetailLoading: true });
    try {
      const detail = await adminApi.getUserDetail(id);
      set({ userDetail: detail });
    } catch {
      set({ userDetail: null });
    } finally {
      set({ userDetailLoading: false });
    }
  },

  fetchUserPosts: async (id, page = 1, pageSize = 10) => {
    set({ userPostsLoading: true });
    try {
      const posts = await adminApi.getUserPosts(id, page, pageSize);
      set({ userPosts: posts });
    } catch {
      set({ userPosts: null });
    } finally {
      set({ userPostsLoading: false });
    }
  },

  fetchUserInfluence: async (id) => {
    set({ userInfluenceLoading: true });
    try {
      const influence = await adminApi.getUserInfluence(id);
      set({ userInfluence: influence });
    } catch {
      set({ userInfluence: null });
    } finally {
      set({ userInfluenceLoading: false });
    }
  },

  fetchUserActionTraces: async (userId, params) => {
    set({ userActionTracesLoading: true });
    try {
      const traces = await adminApi.getUserActionTraces(userId, params);
      set({ userActionTraces: traces });
    } catch {
      set({ userActionTraces: null });
    } finally {
      set({ userActionTracesLoading: false });
    }
  },

  clearUserDetail: () => {
    set({
      userDetail: null,
      userPosts: null,
      userInfluence: null,
      userActionTraces: null,
    });
  },
}));
