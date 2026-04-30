import api from '@/lib/api';
import type { Theme, AiProfile, AiApiKey, AiMemory, UpsertAiProfileDto, CreateApiKeyDto, StoreMemoryDto, ThemeListQuery, MemoryListQuery, DraftListQuery, CreateDraftDto, UpdateDraftDto } from './types';

export const aiApi = {
  // ===== 草稿箱 API =====
  async getDrafts(authorId: string, params: DraftListQuery = {}) {
    const queryParams: Record<string, string> = { authorId };
    if (params.page) queryParams.page = String(params.page);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    const query = new URLSearchParams(queryParams).toString();
    const res = await api.get<{ success: boolean; data: any }>(`/api/posts?${query}`);
    return res.data.data;
  },
  async saveDraft(data: CreateDraftDto) {
    const res = await api.post<{ success: boolean; data: any }>('/api/posts', { ...data, status: 0 });
    return res.data.data;
  },
  async publishDraft(postId: string) {
    const res = await api.put<{ success: boolean; data: any }>(`/api/posts/${postId}`, { status: 2 });
    return res.data.data;
  },
  async deleteDraft(postId: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/posts/${postId}`);
    return res.data.data;
  },

  // ===== 主题 API =====
  async getThemes(params: ThemeListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Theme[] }>(`/api/ai/themes?${query}`);
    return res.data.data;
  },
  async getUserThemes(userId: string) {
    const res = await api.get<{ success: boolean; data: Theme[] }>(`/api/ai/themes/user/${userId}`);
    return res.data.data;
  },
  async purchaseTheme(themeId: number, userId: string) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/ai/themes/${themeId}/purchase`, { userId });
    return res.data.data;
  },
  async activateTheme(themeId: number, userId: string) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/ai/themes/${themeId}/activate`, { userId });
    return res.data.data;
  },
  async getAiProfile(userId: string) {
    const res = await api.get<{ success: boolean; data: AiProfile }>(`/api/ai/profiles/${userId}`);
    return res.data.data;
  },
  async upsertAiProfile(userId: string, data: UpsertAiProfileDto) {
    const res = await api.post<{ success: boolean; data: AiProfile }>(`/api/ai/profiles/${userId}`, data);
    return res.data.data;
  },
  async getApiKeys(userId: string) {
    const res = await api.get<{ success: boolean; data: AiApiKey[] }>(`/api/ai/keys/${userId}`);
    return res.data.data;
  },
  async createApiKey(userId: string, data: CreateApiKeyDto = {}) {
    const res = await api.post<{ success: boolean; data: AiApiKey }>(`/api/ai/keys/${userId}`, data);
    return res.data.data;
  },
  async revokeApiKey(userId: string, keyId: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/ai/keys/${userId}/${keyId}`);
    return res.data.data;
  },
  async getMemories(aiUserId: string, params: MemoryListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: AiMemory[] }>(`/api/ai/memories/${aiUserId}?${query}`);
    return res.data.data;
  },
  async storeMemory(aiUserId: string, data: StoreMemoryDto) {
    const res = await api.post<{ success: boolean; data: AiMemory }>(`/api/ai/memories/${aiUserId}`, data);
    return res.data.data;
  },
  async deleteAiMemory(aiUserId: string, memoryId: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/ai/memories/${aiUserId}/${memoryId}`);
    return res.data.data;
  },
};