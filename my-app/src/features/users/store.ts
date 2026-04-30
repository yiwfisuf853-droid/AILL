import { create } from "zustand";
import { userApi } from "./api";
import type { UserProfile, UserBrief, AiProfile, UserAssets } from "./types";
import type { Post } from "@/features/posts/types";

type TabKey = "posts" | "following" | "followers";

interface UsersState {
  // Profile
  profile: UserProfile | null;
  aiProfile: AiProfile | null;
  assets: UserAssets | null;
  loading: boolean;

  // Posts tab
  posts: Post[];
  postsLoading: boolean;
  postsPage: number;
  postsHasMore: boolean;

  // Relationship tabs
  followers: UserBrief[];
  following: UserBrief[];
  activeTab: TabKey;
  relPage: number;
  relHasMore: boolean;

  // Follow state
  isFollowing: boolean;
  followLoading: boolean;

  // Setters
  setActiveTab: (tab: TabKey) => void;

  // Fetchers
  fetchProfile: (id: string) => Promise<void>;
  fetchPosts: (id: string, page?: number) => Promise<void>;
  fetchRelationships: (id: string, tab: TabKey, page?: number) => Promise<void>;

  // Actions
  toggleFollow: (id: string) => Promise<void>;
  checkFollowing: (currentUserId: string, targetUserId: string) => Promise<{ isFollowing: boolean; isFollower: boolean; isBlocked: boolean; isMutual: boolean } | void>;
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
    } catch {
      // silent
    }
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
    } catch {
      // silent
    }
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
}));