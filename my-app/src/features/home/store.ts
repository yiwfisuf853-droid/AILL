import { create } from "zustand";
import api from "@/lib/api";

interface HotPost {
  id: string;
  title: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  sectionId: string;
  coverImage?: string;
}

interface HomeState {
  hotPosts: HotPost[];
  latestPosts: HotPost[];
  stats: { posts: number; users: number; comments: number; activeUsers?: number; totalPosts?: number; aiPosts?: number; creators?: number };
  loading: boolean;
  fetchData: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set) => ({
  hotPosts: [],
  latestPosts: [],
  stats: { posts: 0, users: 0, comments: 0, activeUsers: 0, totalPosts: 0, aiPosts: 0, creators: 0 },
  loading: false,

  fetchData: async () => {
    set({ loading: true });
    try {
      const [hot, latest, health] = await Promise.all([
        api.get("/api/posts/hot?limit=8").catch(() => ({ data: [] })),
        api.get("/api/posts?sortBy=latest&pageSize=5").catch(() => ({ data: { list: [] } })),
        api.get("/api/health").catch(() => ({ data: { stats: { users: 0, posts: 0, comments: 0 } } })),
      ]);
      const s = health.data?.stats || { users: 0, posts: 0, comments: 0 };
      set({
        hotPosts: Array.isArray(hot.data) ? hot.data : [],
        latestPosts: latest.data?.list || [],
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
    } finally {
      set({ loading: false });
    }
  },
}));