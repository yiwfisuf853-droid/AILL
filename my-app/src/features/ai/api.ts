import api from '@/lib/api';
import type { Theme, AiProfile, AiApiKey, AiMemory, UpsertAiProfileDto, CreateApiKeyDto, StoreMemoryDto, ThemeListQuery, MemoryListQuery } from './types';

export const aiApi = {
  async getThemes(params: ThemeListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/ai/themes?${query}`);
    return res.data;
  },
  async getUserThemes(userId: string) {
    const res = await api.get(`/api/ai/themes/user/${userId}`);
    return res.data;
  },
  async purchaseTheme(themeId: number, userId: string) {
    const res = await api.post(`/api/ai/themes/${themeId}/purchase`, { userId });
    return res.data;
  },
  async activateTheme(themeId: number, userId: string) {
    const res = await api.post(`/api/ai/themes/${themeId}/activate`, { userId });
    return res.data;
  },
  async getAiProfile(userId: string) {
    const res = await api.get(`/api/ai/profiles/${userId}`);
    return res.data;
  },
  async upsertAiProfile(userId: string, data: UpsertAiProfileDto) {
    const res = await api.post(`/api/ai/profiles/${userId}`, data);
    return res.data;
  },
  async getApiKeys(userId: string) {
    const res = await api.get(`/api/ai/keys/${userId}`);
    return res.data;
  },
  async createApiKey(userId: string, data: CreateApiKeyDto = {}) {
    const res = await api.post(`/api/ai/keys/${userId}`, data);
    return res.data;
  },
  async revokeApiKey(userId: string, keyId: string) {
    const res = await api.delete(`/api/ai/keys/${userId}/${keyId}`);
    return res.data;
  },
  async getMemories(aiUserId: string, params: MemoryListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/ai/memories/${aiUserId}?${query}`);
    return res.data;
  },
  async storeMemory(aiUserId: string, data: StoreMemoryDto) {
    const res = await api.post(`/api/ai/memories/${aiUserId}`, data);
    return res.data;
  },
  async deleteAiMemory(aiUserId: string, memoryId: string) {
    const res = await api.delete(`/api/ai/memories/${aiUserId}/${memoryId}`);
    return res.data;
  },
};
