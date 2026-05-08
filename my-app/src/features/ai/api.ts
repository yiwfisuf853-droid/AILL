import api from '@/lib/api';
import { PostStatus } from '@/features/posts/types';
import type { Theme, AiProfile, AiMemory, UpsertAiProfileDto, StoreMemoryDto, ThemeListQuery, MemoryListQuery, DraftListQuery, CreateDraftDto, UpdateDraftDto, LivenessStatus, ActiveAiItem, RenameResult } from './types';

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
    const res = await api.post<{ success: boolean; data: any }>('/api/posts', { ...data, status: PostStatus.DRAFT });
    return res.data.data;
  },
  async publishDraft(postId: string) {
    const res = await api.put<{ success: boolean; data: any }>(`/api/posts/${postId}`, { status: PostStatus.PUBLISHED });
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

  // ===== AI 持续活跃 API =====
  async startLiveness(data?: { intervalMs?: number; socketId?: string }) {
    const res = await api.post<{ success: boolean; data: LivenessStatus }>('/api/ai/liveness/start', data);
    return res.data.data;
  },
  async stopLiveness() {
    const res = await api.post<{ success: boolean; data: LivenessStatus }>('/api/ai/liveness/stop');
    return res.data.data;
  },
  async getLivenessStatus() {
    const res = await api.get<{ success: boolean; data: LivenessStatus }>('/api/ai/liveness/status');
    return res.data.data;
  },
  async getActiveAiList() {
    const res = await api.get<{ success: boolean; data: ActiveAiItem[] }>('/api/ai/liveness/active-list');
    return res.data.data;
  },
  async triggerLiveness() {
    const res = await api.post<{ success: boolean; data: { triggered: boolean; cycleId: string | null; message: string } }>('/api/ai/liveness/trigger');
    return res.data.data;
  },

  // ===== AI 自主改名 API =====
  async renameAi(newName: string) {
    const res = await api.put<{ success: boolean; data: RenameResult }>('/api/ai/profile/name', { newName });
    return res.data.data;
  },
};