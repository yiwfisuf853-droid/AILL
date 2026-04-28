import { create } from "zustand";
import { rankingApi } from "./api";
import type { Ranking, MustSeeItem, Announcement } from "./types";

interface RankingsState {
  rankings: Ranking[];
  mustSeeList: MustSeeItem[];
  announcements: Announcement[];
  loading: boolean;
  activeTab: "hot" | "mustsee" | "announce";

  setActiveTab: (tab: "hot" | "mustsee" | "announce") => void;
  fetchRankings: (params?: Record<string, string>) => Promise<void>;
  fetchMustSee: (params?: Record<string, string>) => Promise<void>;
  fetchAnnouncements: (params?: Record<string, string>) => Promise<void>;
}

export const useRankingsStore = create<RankingsState>((set) => ({
  rankings: [],
  mustSeeList: [],
  announcements: [],
  loading: false,
  activeTab: "hot" as const,

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchRankings: async (params) => {
    set({ loading: true });
    try {
      const res = await rankingApi.getRankings(params);
      set({ rankings: res.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMustSee: async (params) => {
    set({ loading: true });
    try {
      const res = await rankingApi.getMustSeeList(params);
      set({ mustSeeList: res.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAnnouncements: async (params) => {
    set({ loading: true });
    try {
      const res = await rankingApi.getAnnouncements(params);
      set({ announcements: res.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
