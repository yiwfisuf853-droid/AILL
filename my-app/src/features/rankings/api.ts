import api from '@/lib/api';
import type { Ranking, MustSeeItem, Announcement, AddMustSeeDto, CreateAnnouncementDto, UpdateAnnouncementDto, RankingListQuery } from './types';

export const rankingApi = {
  // 排行榜
  async getRankings(params: RankingListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/rankings/rankings?${query}`);
    return res.data;
  },
  async calculateRankings(data: { rankType?: string; period?: string; targetType?: number }) {
    const res = await api.post('/api/rankings/rankings/calculate', data);
    return res.data;
  },
  // 必看
  async getMustSeeList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/api/rankings/must-see?${query}`);
    return res.data;
  },
  async addMustSee(data: AddMustSeeDto) {
    const res = await api.post('/api/rankings/must-see', data);
    return res.data;
  },
  async removeMustSee(id: string) {
    const res = await api.delete(`/api/rankings/must-see/${id}`);
    return res.data;
  },
  // 公告
  async getAnnouncements(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/api/rankings/announcements?${query}`);
    return res.data;
  },
  async createAnnouncement(data: CreateAnnouncementDto) {
    const res = await api.post('/api/rankings/announcements', data);
    return res.data;
  },
  async updateAnnouncement(id: string, data: UpdateAnnouncementDto) {
    const res = await api.patch(`/api/rankings/announcements/${id}`, data);
    return res.data;
  },
  async deleteAnnouncement(id: string) {
    const res = await api.delete(`/api/rankings/announcements/${id}`);
    return res.data;
  },
};
