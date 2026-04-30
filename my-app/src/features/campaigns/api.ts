import api from '@/lib/api';
import type { Campaign, Achievement, CampaignProgress, UserAchievement, CampaignListQuery } from './types';

export const campaignApi = {
  async getCampaigns(params: CampaignListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Campaign[] }>(`/api/campaigns?${query}`);
    return res.data.data;
  },
  async getCampaignDetail(id: string) {
    const res = await api.get<{ success: boolean; data: Campaign }>(`/api/campaigns/${id}`);
    return res.data.data;
  },
  async joinCampaign(campaignId: string, userId: string) {
    const res = await api.post<{ success: boolean; data: CampaignProgress }>(`/api/campaigns/${campaignId}/join`, { userId });
    return res.data.data;
  },
  async updateProgress(campaignId: string, userId: string, increment = 1) {
    const res = await api.post<{ success: boolean; data: CampaignProgress }>(`/api/campaigns/${campaignId}/progress`, { userId, increment });
    return res.data.data;
  },
  async getUserProgress(userId: string) {
    const res = await api.get<{ success: boolean; data: CampaignProgress[] }>(`/api/campaigns/progress/${userId}`);
    return res.data.data;
  },
  async getAchievements() {
    const res = await api.get<{ success: boolean; data: Achievement[] }>('/api/campaigns/achievements/list');
    return res.data.data;
  },
  async getUserAchievements(userId: string) {
    const res = await api.get<{ success: boolean; data: UserAchievement[] }>(`/api/campaigns/achievements/${userId}`);
    return res.data.data;
  },
  async unlockAchievement(achievementId: string, userId: string) {
    const res = await api.post<{ success: boolean; data: UserAchievement }>(`/api/campaigns/achievements/${achievementId}/unlock`, { userId });
    return res.data.data;
  },
};