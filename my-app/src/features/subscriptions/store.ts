import { create } from 'zustand';
import type { Subscription, CreateSubscriptionDto, SubscriptionListResponse } from './types';
import { subscriptionApi } from './api';

interface SubscriptionsState {
  // 订阅列表
  subscriptionList: Subscription[];
  subscriptionListLoading: boolean;
  subscriptionListTotal: number;
  subscriptionListPage: number;
  subscriptionListHasMore: boolean;

  // AI 帖子流
  aiPostList: any[];
  aiPostListLoading: boolean;
  aiPostListTotal: number;
  aiPostListPage: number;
  aiPostListHasMore: boolean;

  // 订阅状态缓存（targetId → isSubscribed）
  subscriptionStatusMap: Record<string, boolean>;
  subscriptionStatusLoading: Record<string, boolean>;

  // 操作锁
  actionLoading: Record<string, boolean>;

  // Actions - 订阅列表
  fetchSubscriptions: (params?: { type?: string; status?: string; page?: number; pageSize?: number }) => Promise<void>;
  refreshSubscriptions: () => Promise<void>;

  // Actions - AI 帖子流
  fetchAiPosts: (page?: number) => Promise<void>;
  refreshAiPosts: () => Promise<void>;

  // Actions - 订阅操作
  createSubscription: (data: CreateSubscriptionDto) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  cancelSubscriptionByTarget: (type: string, targetId: string) => Promise<void>;
  updateSettings: (id: string, notificationSettings: Subscription['notificationSettings']) => Promise<void>;

  // Actions - 订阅状态检查
  checkSubscription: (type: string, targetId: string) => Promise<boolean>;
}

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscriptionList: [],
  subscriptionListLoading: false,
  subscriptionListTotal: 0,
  subscriptionListPage: 1,
  subscriptionListHasMore: false,

  aiPostList: [],
  aiPostListLoading: false,
  aiPostListTotal: 0,
  aiPostListPage: 1,
  aiPostListHasMore: false,

  subscriptionStatusMap: {},
  subscriptionStatusLoading: {},

  actionLoading: {},

  // 获取订阅列表
  fetchSubscriptions: async (params) => {
    set({ subscriptionListLoading: true });
    try {
      const response = await subscriptionApi.getSubscriptions(params);
      const isRefresh = !params?.page || params.page === 1;
      set({
        subscriptionList: isRefresh ? response.list : [...get().subscriptionList, ...response.list],
        subscriptionListTotal: response.total,
        subscriptionListPage: response.page,
        subscriptionListHasMore: response.hasMore,
        subscriptionListLoading: false,
      });
    } catch {
      set({ subscriptionListLoading: false });
    }
  },

  // 刷新订阅列表
  refreshSubscriptions: async () => {
    await get().fetchSubscriptions({ page: 1 });
  },

  // 获取 AI 帖子流
  fetchAiPosts: async (page = 1) => {
    set({ aiPostListLoading: true });
    try {
      const response = await subscriptionApi.getAiPosts({ page, pageSize: 20 });
      set({
        aiPostList: page === 1 ? response.list : [...get().aiPostList, ...response.list],
        aiPostListTotal: response.total,
        aiPostListPage: response.page,
        aiPostListHasMore: response.hasMore,
        aiPostListLoading: false,
      });
    } catch {
      set({ aiPostListLoading: false });
    }
  },

  // 刷新 AI 帖子流
  refreshAiPosts: async () => {
    await get().fetchAiPosts(1);
  },

  // 创建订阅
  createSubscription: async (data) => {
    const loading = get().actionLoading;
    const key = `create-${data.type}-${data.targetId}`;
    if (loading[key]) return;
    set({ actionLoading: { ...loading, [key]: true } });
    try {
      await subscriptionApi.createSubscription(data);
      // 更新订阅状态缓存
      set((state) => ({
        subscriptionStatusMap: { ...state.subscriptionStatusMap, [data.targetId]: true },
      }));
      // 刷新列表
      get().refreshSubscriptions();
    } catch {
      throw new Error('订阅失败');
    } finally {
      const after = { ...get().actionLoading };
      delete after[key];
      set({ actionLoading: after });
    }
  },

  // 取消订阅
  cancelSubscription: async (id) => {
    const loading = get().actionLoading;
    if (loading[`cancel-${id}`]) return;
    set({ actionLoading: { ...loading, [`cancel-${id}`]: true } });
    try {
      await subscriptionApi.cancelSubscription(id);
      // 从列表中移除
      set((state) => {
        const removed = state.subscriptionList.find((s) => s.id === id);
        const newStatusMap = { ...state.subscriptionStatusMap };
        if (removed) {
          newStatusMap[removed.targetId] = false;
        }
        return {
          subscriptionList: state.subscriptionList.filter((s) => s.id !== id),
          subscriptionListTotal: state.subscriptionListTotal - 1,
          subscriptionStatusMap: newStatusMap,
        };
      });
    } catch {
      throw new Error('取消订阅失败');
    } finally {
      const after = { ...get().actionLoading };
      delete after[`cancel-${id}`];
      set({ actionLoading: after });
    }
  },

  // 通过 targetId 取消订阅（用于用户主页）
  cancelSubscriptionByTarget: async (type, targetId) => {
    const loading = get().actionLoading;
    const key = `cancel-${type}-${targetId}`;
    if (loading[key]) return;
    set({ actionLoading: { ...loading, [key]: true } });
    try {
      // 先查找订阅记录
      const subs = get().subscriptionList;
      const sub = subs.find((s) => s.targetId === targetId);
      if (sub) {
        await subscriptionApi.cancelSubscription(sub.id);
        set((state) => ({
          subscriptionList: state.subscriptionList.filter((s) => s.id !== sub.id),
          subscriptionListTotal: state.subscriptionListTotal - 1,
          subscriptionStatusMap: { ...state.subscriptionStatusMap, [targetId]: false },
        }));
      } else {
        // 列表中没有，尝试通过 API 查找后取消
        const response = await subscriptionApi.getSubscriptions({ type, pageSize: 100 });
        const found = response.list.find((s: Subscription) => s.targetId === targetId);
        if (found) {
          await subscriptionApi.cancelSubscription(found.id);
          set((state) => ({
            subscriptionStatusMap: { ...state.subscriptionStatusMap, [targetId]: false },
          }));
        }
      }
    } catch {
      throw new Error('取消订阅失败');
    } finally {
      const after = { ...get().actionLoading };
      delete after[key];
      set({ actionLoading: after });
    }
  },

  // 更新通知设置
  updateSettings: async (id, notificationSettings) => {
    const loading = get().actionLoading;
    if (loading[`settings-${id}`]) return;
    set({ actionLoading: { ...loading, [`settings-${id}`]: true } });
    try {
      await subscriptionApi.updateSettings(id, notificationSettings);
      // 乐观更新列表中的对应项
      set((state) => ({
        subscriptionList: state.subscriptionList.map((s) =>
          s.id === id ? { ...s, notificationSettings: { ...s.notificationSettings, ...notificationSettings } } : s
        ),
      }));
    } catch {
      throw new Error('更新设置失败');
    } finally {
      const after = { ...get().actionLoading };
      delete after[`settings-${id}`];
      set({ actionLoading: after });
    }
  },

  // 检查订阅状态
  checkSubscription: async (type, targetId) => {
    const loading = get().subscriptionStatusLoading;
    if (loading[targetId]) return get().subscriptionStatusMap[targetId] ?? false;
    set({ subscriptionStatusLoading: { ...loading, [targetId]: true } });
    try {
      const result = await subscriptionApi.checkSubscription(type, targetId);
      set((state) => ({
        subscriptionStatusMap: { ...state.subscriptionStatusMap, [targetId]: result.isSubscribed },
        subscriptionStatusLoading: { ...state.subscriptionStatusLoading, [targetId]: false },
      }));
      return result.isSubscribed;
    } catch {
      set((state) => ({
        subscriptionStatusLoading: { ...state.subscriptionStatusLoading, [targetId]: false },
      }));
      return false;
    }
  },
}));
