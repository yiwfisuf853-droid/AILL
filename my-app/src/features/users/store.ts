import { create } from "zustand";
import { userApi } from "./api";
import type { UserProfile, UserBrief, AiProfile, UserAssets } from "./types";
import type { Post } from "@/features/posts/types";
import { subscriptionApi } from "@/features/subscriptions/api";
import type { Subscription, CreateSubscriptionDto, SubscriptionListResponse } from "@/features/subscriptions/types";
import { collectionApi } from "@/features/collections/api";
import type { Collection, CollectionCreateDto } from "@/features/collections/types";
import { aiApi } from "@/features/ai/api";
import type { Theme, AiProfile as AiFeatureProfile, Draft, LivenessStatus, ActiveAiItem, RenameResult } from "@/features/ai/types";

type TabKey = "posts" | "following" | "followers";
type AiTabKey = "overview" | "create" | "drafts" | "profile" | "themes" | "memories";

export type AiPhase = 'thinking' | 'acting' | 'idle' | null;

/** 行为阻断级别（2.0 分级锁屏） */
export type BlockLevel = 'read' | 'interact' | 'create';

/** 轮次统计摘要（idle 阶段推送） */
export interface CycleSummary {
  totalActions: number;
  successCount: number;
  durationMs: number;
  nextHint: string | null;
}

/** AI 记忆条目 */
export interface AiMemoryItem {
  key: string;
  content: string;
  importance: number;
  type: 'observation' | 'social' | 'emotion' | 'decision';
}

export interface AiLivenessStatus {
  aiUserId: string;
  aiName: string;
  phase: AiPhase;
  cycleId: string;
  timestamp: string;
  action?: string;
  params?: Record<string, unknown>;
  reason?: string;
  cycleSummary?: CycleSummary;
  /** 2.0 分级锁屏：当前被锁定的区域标识集合 */
  lockedAreas?: string[];
  /** 2.0 分级锁屏：检查某区域是否被锁定 */
  isAreaLocked?: (area: string) => boolean;
  /** 2.0 最近记忆摘要 */
  recentMemories?: AiMemoryItem[];
}

export interface AiAction {
  type: string;
  success: boolean;
  result?: {
    targetType?: string;
    targetId?: string;
    postId?: string;
    keyword?: string;
    action?: string;
    amount?: number;
    oldName?: string;
    newName?: string;
    [key: string]: unknown;
  } | null;
  error?: string;
}

export interface AiActivity {
  aiUserId: string;
  aiName: string;
  timestamp: string;
  actions: AiAction[];
}

interface Memory {
  id: string;
  content: string;
  createdAt: string;
}

interface UsersState {
  profile: UserProfile | null;
  aiProfile: AiProfile | null;
  assets: UserAssets | null;
  loading: boolean;

  posts: Post[];
  postsLoading: boolean;
  postsPage: number;
  postsHasMore: boolean;

  followers: UserBrief[];
  following: UserBrief[];
  activeTab: TabKey;
  relPage: number;
  relHasMore: boolean;

  isFollowing: boolean;
  followLoading: boolean;

  subscriptionList: Subscription[];
  subscriptionListLoading: boolean;
  subscriptionListTotal: number;
  subscriptionListPage: number;
  subscriptionListHasMore: boolean;

  aiPostList: any[];
  aiPostListLoading: boolean;
  aiPostListTotal: number;
  aiPostListPage: number;
  aiPostListHasMore: boolean;

  subscriptionStatusMap: Record<string, boolean>;
  subscriptionStatusLoading: Record<string, boolean>;

  actionLoading: Record<string, boolean>;

  collections: Collection[];
  collectionsLoading: boolean;
  collectionsError: string | null;

  setActiveTab: (tab: TabKey) => void;
  fetchProfile: (id: string) => Promise<void>;
  fetchPosts: (id: string, page?: number) => Promise<void>;
  fetchRelationships: (id: string, tab: TabKey, page?: number) => Promise<void>;
  toggleFollow: (id: string) => Promise<void>;
  checkFollowing: (currentUserId: string, targetUserId: string) => Promise<{ isFollowing: boolean; isFollower: boolean; isBlocked: boolean; isMutual: boolean } | void>;

  fetchSubscriptions: (params?: { type?: string; status?: string; page?: number; pageSize?: number }) => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  fetchAiPosts: (page?: number) => Promise<void>;
  refreshAiPosts: () => Promise<void>;
  createSubscription: (data: CreateSubscriptionDto) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  cancelSubscriptionByTarget: (type: string, targetId: string) => Promise<void>;
  updateSettings: (id: string, notificationSettings: Subscription['notificationSettings']) => Promise<void>;
  checkSubscription: (type: string, targetId: string) => Promise<boolean>;

  fetchCollections: () => Promise<void>;
  createCollection: (data: CollectionCreateDto) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addPostToCollection: (collectionId: string, postId: string) => Promise<void>;
  removePostFromCollection: (collectionId: string, postId: string) => Promise<void>;

  aiActiveTab: AiTabKey;
  aiLoading: boolean;
  aiFeatureProfile: AiFeatureProfile | null;
  aiThemes: Theme[];
  aiUserTheme: Theme[];
  aiActiveThemeId: number | null;
  aiMemories: Memory[];
  aiNewMemory: string;
  aiStoringMemory: boolean;
  aiDrafts: Draft[];
  aiDraftsLoading: boolean;
  aiLivenessStatus: LivenessStatus | null;
  aiLivenessLoading: boolean;
  aiActiveAiList: ActiveAiItem[];
  aiActivityLivenessStatus: AiLivenessStatus | null;
  aiCurrentActivity: AiActivity | null;
  aiIsOverlayVisible: boolean;
  aiIsDismissed: boolean;
  aiIsCompanionVisible: boolean;
  aiRecentActivities: AiActivity[];

  aiSetActiveTab: (tab: AiTabKey) => void;
  aiSetLoading: (loading: boolean) => void;
  aiSetProfile: (profile: AiFeatureProfile | null) => void;
  aiSetThemes: (themes: Theme[]) => void;
  aiSetUserTheme: (themes: Theme[]) => void;
  aiSetActiveThemeId: (id: number | null) => void;
  aiSetMemories: (memories: Memory[]) => void;
  aiSetNewMemory: (memory: string) => void;
  aiSetStoringMemory: (storing: boolean) => void;
  aiSetDrafts: (drafts: Draft[]) => void;
  aiSetDraftsLoading: (loading: boolean) => void;

  aiFetchProfile: (userId: string) => Promise<void>;
  aiFetchThemes: (userId: string) => Promise<void>;
  aiFetchMemories: (userId: string) => Promise<void>;
  aiFetchDrafts: (userId: string) => Promise<void>;
  aiFetchData: (userId: string) => Promise<void>;

  aiUpsertProfile: (userId: string, data: Partial<AiFeatureProfile>) => Promise<void>;
  aiPurchaseTheme: (themeId: number, userId: string) => Promise<void>;
  aiActivateTheme: (themeId: number, userId: string) => Promise<void>;
  aiStoreMemory: (userId: string, data: { content: string }) => Promise<void>;
  aiDeleteMemory: (userId: string, memoryId: string) => Promise<void>;
  aiSaveDraft: (data: { title: string; content: string; sectionId?: string; tags?: string[] }) => Promise<void>;
  aiPublishDraft: (postId: string, userId: string) => Promise<void>;
  aiDeleteDraft: (postId: string, userId: string) => Promise<void>;

  aiStartLiveness: (options?: { intervalMs?: number; socketId?: string }) => Promise<void>;
  aiStopLiveness: () => Promise<void>;
  aiFetchLivenessStatus: () => Promise<void>;
  aiFetchActiveAiList: () => Promise<void>;
  aiRenameAi: (newName: string) => Promise<RenameResult | null>;

  aiSetActivityLivenessStatus: (status: AiLivenessStatus) => void;
  aiSetActivity: (activity: AiActivity) => void;
  aiShowOverlay: () => void;
  aiHideOverlay: () => void;
  aiDismissOverlay: () => void;
  aiShowCompanion: () => void;
  aiDismissCompanion: () => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  profile: null,
  aiProfile: null,
  assets: null,
  loading: false,
  posts: [],
  postsLoading: false,
  postsPage: 1,
  postsHasMore: false,
  followers: [],
  following: [],
  activeTab: "posts",
  relPage: 1,
  relHasMore: false,
  isFollowing: false,
  followLoading: false,

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

  collections: [],
  collectionsLoading: false,
  collectionsError: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchProfile: async (id) => {
    set({ loading: true });
    try {
      const [profile, postsRes] = await Promise.all([
        userApi.getUser(id).catch(() => null),
        userApi.getUserPosts(id, { page: 1, pageSize: 10 }).catch(() => ({ list: [], hasMore: false })),
      ]);
      if (profile) {
        const sideEffects: Promise<void>[] = [];
        if (profile.isAi) {
          sideEffects.push(
            userApi.getAiProfile(id).then((ai) => set({ aiProfile: ai })).catch(() => {})
          );
        }
        sideEffects.push(
          userApi.getUserAssets(id).then((a) => set({ assets: a })).catch(() => {})
        );
        await Promise.all(sideEffects);
        const postsData = postsRes || { list: [], hasMore: false };
        set({ profile, posts: postsData.list || [], postsHasMore: postsData.hasMore || false, postsPage: 1 });
      }
    } finally {
      set({ loading: false });
    }
  },

  checkFollowing: async (currentUserId, targetUserId) => {
    try {
      const result = await userApi.checkRelationship(currentUserId, targetUserId);
      set({ isFollowing: result.isFollowing });
      return result;
    } catch {}
  },

  fetchPosts: async (id, page = 1) => {
    const { postsLoading } = get();
    if (postsLoading) return;
    set({ postsLoading: true });
    try {
      const res = await userApi.getUserPosts(id, { page, pageSize: 10 });
      set((state) => ({
        posts: page === 1 ? (res.list || []) : [...state.posts, ...(res.list || [])],
        postsPage: page,
        postsHasMore: res.hasMore || false,
      }));
    } finally {
      set({ postsLoading: false });
    }
  },

  fetchRelationships: async (id, tab, page = 1) => {
    const apiFn = tab === "followers" ? userApi.getFollowers : userApi.getFollowing;
    try {
      const res = await apiFn(id, { page, pageSize: 20 });
      const list = res.list || [];
      set((state) => ({
        ...(tab === "followers" ? { followers: page === 1 ? list : [...state.followers, ...list] } : { following: page === 1 ? list : [...state.following, ...list] }),
        relPage: page,
        relHasMore: res.hasMore || false,
      }));
    } catch {}
  },

  toggleFollow: async (id) => {
    const { followLoading } = get();
    if (followLoading) return;
    set({ followLoading: true });
    try {
      const result = await userApi.toggleFollow(id);
      set((state) => ({
        isFollowing: result.isFollowing,
        profile: state.profile
          ? { ...state.profile, followerCount: result.followerCount, followingCount: result.followingCount }
          : state.profile,
      }));
    } finally {
      set({ followLoading: false });
    }
  },

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

  refreshSubscriptions: async () => {
    await get().fetchSubscriptions({ page: 1 });
  },

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

  refreshAiPosts: async () => {
    await get().fetchAiPosts(1);
  },

  createSubscription: async (data) => {
    const loading = get().actionLoading;
    const key = `create-${data.type}-${data.targetId}`;
    if (loading[key]) return;
    set({ actionLoading: { ...loading, [key]: true } });
    try {
      await subscriptionApi.createSubscription(data);
      set((state) => ({
        subscriptionStatusMap: { ...state.subscriptionStatusMap, [data.targetId]: true },
      }));
      get().refreshSubscriptions();
    } catch {
      throw new Error('订阅失败');
    } finally {
      const after = { ...get().actionLoading };
      delete after[key];
      set({ actionLoading: after });
    }
  },

  cancelSubscription: async (id) => {
    const loading = get().actionLoading;
    if (loading[`cancel-${id}`]) return;
    set({ actionLoading: { ...loading, [`cancel-${id}`]: true } });
    try {
      await subscriptionApi.cancelSubscription(id);
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

  cancelSubscriptionByTarget: async (type, targetId) => {
    const loading = get().actionLoading;
    const key = `cancel-${type}-${targetId}`;
    if (loading[key]) return;
    set({ actionLoading: { ...loading, [key]: true } });
    try {
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

  updateSettings: async (id, notificationSettings) => {
    const loading = get().actionLoading;
    if (loading[`settings-${id}`]) return;
    set({ actionLoading: { ...loading, [`settings-${id}`]: true } });
    try {
      await subscriptionApi.updateSettings(id, notificationSettings);
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

  fetchCollections: async () => {
    set({ collectionsLoading: true, collectionsError: null });
    try {
      const res: any = await collectionApi.getCollections();
      set({ collections: res.list || res || [], collectionsLoading: false });
    } catch {
      set({ collectionsError: "加载失败", collectionsLoading: false });
    }
  },

  createCollection: async (data) => {
    try {
      const res: any = await collectionApi.createCollection(data);
      if (res.success || res.id) {
        await get().fetchCollections();
      }
    } catch {
      set({ collectionsError: "创建失败" });
      throw new Error("创建失败");
    }
  },

  deleteCollection: async (id) => {
    try {
      await collectionApi.deleteCollection(id);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
      }));
    } catch {
      set({ collectionsError: "删除失败" });
    }
  },

  addPostToCollection: async (collectionId, postId) => {
    try {
      await collectionApi.addPostToCollection(collectionId, { postId });
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, postCount: (c.postCount || 0) + 1 } : c
        ),
      }));
    } catch {
      set({ collectionsError: "添加失败" });
      throw new Error("添加失败");
    }
  },

  removePostFromCollection: async (collectionId, postId) => {
    try {
      await collectionApi.removePostFromCollection(collectionId, postId);
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, postCount: Math.max(0, (c.postCount || 0) - 1) } : c
        ),
      }));
    } catch {
      set({ collectionsError: "移除失败" });
      throw new Error("移除失败");
    }
  },

  aiActiveTab: "overview",
  aiLoading: false,
  aiFeatureProfile: null,
  aiThemes: [],
  aiUserTheme: [],
  aiActiveThemeId: null,
  aiMemories: [],
  aiNewMemory: "",
  aiStoringMemory: false,
  aiDrafts: [],
  aiDraftsLoading: false,
  aiLivenessStatus: null,
  aiLivenessLoading: false,
  aiActiveAiList: [],
  aiActivityLivenessStatus: null,
  aiCurrentActivity: null,
  aiIsOverlayVisible: false,
  aiIsDismissed: false,
  aiIsCompanionVisible: true,
  aiRecentActivities: [],

  aiSetActiveTab: (tab) => set({ aiActiveTab: tab }),
  aiSetLoading: (loading) => set({ aiLoading: loading }),
  aiSetProfile: (profile) => set({ aiFeatureProfile: profile }),
  aiSetThemes: (themes) => set({ aiThemes: themes }),
  aiSetUserTheme: (themes) => set({ aiUserTheme: themes }),
  aiSetActiveThemeId: (id) => set({ aiActiveThemeId: id }),
  aiSetMemories: (memories) => set({ aiMemories: memories }),
  aiSetNewMemory: (memory) => set({ aiNewMemory: memory }),
  aiSetStoringMemory: (storing) => set({ aiStoringMemory: storing }),
  aiSetDrafts: (drafts) => set({ aiDrafts: drafts }),
  aiSetDraftsLoading: (loading) => set({ aiDraftsLoading: loading }),

  aiFetchProfile: async (userId) => {
    try {
      const res: any = await aiApi.getAiProfile(userId);
      set({ aiFeatureProfile: res.profile || res || null });
    } catch {
      set({ aiFeatureProfile: null });
    }
  },

  aiFetchThemes: async (userId) => {
    try {
      const [allRes, userRes] = await Promise.all([
        aiApi.getThemes(),
        userId ? aiApi.getUserThemes(userId) : Promise.resolve({ list: [] }),
      ]);
      const allThemes: any = allRes;
      const userThemes: any = userRes;
      set({ aiThemes: allThemes.list || allThemes || [], aiUserTheme: userThemes.list || userThemes || [] });
      const activeTheme = (userThemes.list || userThemes || []).find(
        (t: Theme & { isActive?: number }) => (t as any).isActive === 1
      );
      set({ aiActiveThemeId: activeTheme?.id || null });
    } catch {
      set({ aiThemes: [], aiUserTheme: [], aiActiveThemeId: null });
    }
  },

  aiFetchMemories: async (userId) => {
    try {
      const res: any = await aiApi.getMemories(userId);
      const memList = res.list || res || [];
      set({ aiMemories: memList });
    } catch {
      set({ aiMemories: [] });
    }
  },

  aiFetchDrafts: async (userId) => {
    set({ aiDraftsLoading: true });
    try {
      const res: any = await aiApi.getDrafts(userId, { pageSize: 50, sortBy: 'latest' });
      set({ aiDrafts: res.list || res || [] });
    } catch {
      set({ aiDrafts: [] });
    } finally {
      set({ aiDraftsLoading: false });
    }
  },

  aiFetchData: async (userId) => {
    const { aiActiveTab } = get();
    set({ aiLoading: true });
    const promises: Promise<void>[] = [];

    if (aiActiveTab === "profile") promises.push(get().aiFetchProfile(userId));
    if (aiActiveTab === "themes") promises.push(get().aiFetchThemes(userId));
    if (aiActiveTab === "memories") promises.push(get().aiFetchMemories(userId));
    if (aiActiveTab === "drafts") promises.push(get().aiFetchDrafts(userId));

    if (promises.length === 0) {
      set({ aiLoading: false });
      return;
    }
    await Promise.all(promises);
    set({ aiLoading: false });
  },

  aiUpsertProfile: async (userId, data) => {
    await aiApi.upsertAiProfile(userId, data);
    await get().aiFetchProfile(userId);
  },

  aiPurchaseTheme: async (themeId, userId) => {
    await aiApi.purchaseTheme(themeId, userId);
    await get().aiFetchThemes(userId);
  },

  aiActivateTheme: async (themeId, userId) => {
    await aiApi.activateTheme(themeId, userId);
    set({ aiActiveThemeId: themeId });
    await get().aiFetchThemes(userId);
  },

  aiStoreMemory: async (userId, data) => {
    set({ aiStoringMemory: true });
    try {
      await aiApi.storeMemory(userId, data);
      set({ aiNewMemory: "" });
      await get().aiFetchMemories(userId);
    } finally {
      set({ aiStoringMemory: false });
    }
  },

  aiDeleteMemory: async (userId, memoryId) => {
    await aiApi.deleteAiMemory(userId, memoryId);
    await get().aiFetchMemories(userId);
  },

  aiSaveDraft: async (data) => {
    await aiApi.saveDraft(data);
  },

  aiPublishDraft: async (postId, userId) => {
    await aiApi.publishDraft(postId);
    await get().aiFetchDrafts(userId);
  },

  aiDeleteDraft: async (postId, userId) => {
    await aiApi.deleteDraft(postId);
    await get().aiFetchDrafts(userId);
  },

  aiStartLiveness: async (options) => {
    set({ aiLivenessLoading: true });
    try {
      const res: any = await aiApi.startLiveness(options);
      set({ aiLivenessStatus: res });
    } catch {} finally {
      set({ aiLivenessLoading: false });
    }
  },

  aiStopLiveness: async () => {
    set({ aiLivenessLoading: true });
    try {
      const res: any = await aiApi.stopLiveness();
      set({ aiLivenessStatus: res });
    } catch {} finally {
      set({ aiLivenessLoading: false });
    }
  },

  aiFetchLivenessStatus: async () => {
    try {
      const res: any = await aiApi.getLivenessStatus();
      set({ aiLivenessStatus: res });
    } catch {}
  },

  aiFetchActiveAiList: async () => {
    try {
      const res: any = await aiApi.getActiveAiList();
      set({ aiActiveAiList: res.list || res || [] });
    } catch {
      set({ aiActiveAiList: [] });
    }
  },

  aiRenameAi: async (newName) => {
    try {
      const res: any = await aiApi.renameAi(newName);
      return res as RenameResult;
    } catch {
      return null;
    }
  },

  aiSetActivityLivenessStatus: (status) => {
    set((state) => {
      const isNewCycle = status.phase === 'thinking';
      return {
        aiActivityLivenessStatus: status,
        aiIsOverlayVisible: isNewCycle ? true : !state.aiIsDismissed,
        aiIsDismissed: isNewCycle ? false : state.aiIsDismissed,
      };
    });
  },

  aiSetActivity: (activity) => {
    set((state) => ({
      aiCurrentActivity: activity,
      aiIsOverlayVisible: !state.aiIsDismissed,
      aiRecentActivities: [activity, ...state.aiRecentActivities].slice(0, 20),
    }));
  },

  aiShowOverlay: () => {
    set({ aiIsOverlayVisible: true, aiIsDismissed: false });
  },

  aiHideOverlay: () => {
    set({ aiIsOverlayVisible: false });
  },

  aiDismissOverlay: () => {
    set({ aiIsOverlayVisible: false, aiIsDismissed: true });
  },

  aiShowCompanion: () => {
    set({ aiIsCompanionVisible: true });
  },

  aiDismissCompanion: () => {
    set({ aiIsCompanionVisible: false });
  },
}));

export const useSubscriptionsStore = useUsersStore;
export const useCollectionsStore = useUsersStore;
