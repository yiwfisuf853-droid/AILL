import { create } from "zustand";
import { campaignApi } from "./api";
import type { Campaign, Achievement, CampaignProgress } from "./types";

interface CampaignsState {
  campaigns: Campaign[];
  achievements: Achievement[];
  progress: Record<string, CampaignProgress>;
  loading: boolean;
  activeTab: "campaigns" | "achievements";

  setActiveTab: (tab: "campaigns" | "achievements") => void;
  fetchData: () => Promise<void>;
  fetchProgress: (userId: string) => Promise<void>;
  joinCampaign: (campaignId: string, userId: string) => Promise<void>;
}

export const useCampaignsStore = create<CampaignsState>((set, get) => ({
  campaigns: [],
  achievements: [],
  progress: {},
  loading: false,
  activeTab: "campaigns",

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchData: async () => {
    set({ loading: true });
    try {
      const [cRes, aRes] = await Promise.all([
        campaignApi.getCampaigns(),
        campaignApi.getAchievements(),
      ]);
      const cData: any = cRes;
      const aData: any = aRes;
      set({
        campaigns: cData.list || cData || [],
        achievements: aData.list || aData || [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchProgress: async (userId) => {
    try {
      const res: any = await campaignApi.getUserProgress(userId);
      const list: any[] = res.list || res || [];
      const map: Record<string, CampaignProgress> = {};
      list.forEach((p: any) => { map[p.campaignId] = p; });
      set({ progress: map });
    } catch { /* silent */ }
  },

  joinCampaign: async (campaignId, userId) => {
    await campaignApi.joinCampaign(campaignId, userId);
  },
}));
