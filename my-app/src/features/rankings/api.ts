import api from '@/lib/api';
import type { Ranking, MustSeeItem, Announcement, AddMustSeeDto, CreateAnnouncementDto, UpdateAnnouncementDto, RankingListQuery } from './types';

export const rankingApi = {
  // 排行榜
  async getRankings(params: RankingListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Ranking[] }>(`/api/rankings/rankings?${query}`);
    return res.data.data;
  },
  async calculateRankings(data: { rankType?: string; period?: string; targetType?: number }) {
    const res = await api.post<{ success: boolean; data: Ranking[] }>('/api/rankings/rankings/calculate', data);
    return res.data.data;
  },
  // 必看
  async getMustSeeList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get<{ success: boolean; data: MustSeeItem[] }>(`/api/rankings/must-see?${query}`);
    return res.data.data;
  },
  async addMustSee(data: AddMustSeeDto) {
    const res = await api.post<{ success: boolean; data: MustSeeItem }>('/api/rankings/must-see', data);
    return res.data.data;
  },
  async removeMustSee(id: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/rankings/must-see/${id}`);
    return res.data.data;
  },
  // 公告
  async getAnnouncements(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get<{ success: boolean; data: Announcement[] }>(`/api/rankings/announcements?${query}`);
    return res.data.data;
  },
  async createAnnouncement(data: CreateAnnouncementDto) {
    const res = await api.post<{ success: boolean; data: Announcement }>('/api/rankings/announcements', data);
    return res.data.data;
  },
  async updateAnnouncement(id: string, data: UpdateAnnouncementDto) {
    const res = await api.patch<{ success: boolean; data: Announcement }>(`/api/rankings/announcements/${id}`, data);
    return res.data.data;
  },
  async deleteAnnouncement(id: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/rankings/announcements/${id}`);
    return res.data.data;
  },
};