import api from '@/lib/api';
import type { FavoriteFolder, FavoriteItem, FavoriteListResponse } from './types';

export const favoriteApi = {
  async getFolders(userId: string): Promise<FavoriteFolder[]> {
    const res = await api.get<{ success: boolean; data: { total: number; list: FavoriteFolder[] } }>(`/api/favorites/${userId}/folders`);
    return res.data.data.list;
  },

  async createFolder(userId: string, data: { name: string; description?: string }): Promise<FavoriteFolder> {
    const res = await api.post<{ success: boolean; data: FavoriteFolder }>(`/api/favorites/${userId}/folders`, data);
    return res.data.data;
  },

  async getFavorites(userId: string, params: { folderId?: string; page?: number; limit?: number } = {}): Promise<FavoriteListResponse> {
    const query = new URLSearchParams();
    if (params.folderId) query.append('folderId', params.folderId);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    const res = await api.get<{ success: boolean; data: FavoriteListResponse }>(`/api/favorites/${userId}/favorites?${query}`);
    return res.data.data;
  },

  async addFavorite(userId: string, data: { targetType: string; targetId: string; folderId?: string }): Promise<FavoriteItem> {
    const res = await api.post<{ success: boolean; data: FavoriteItem }>(`/api/favorites/${userId}/favorites`, data);
    return res.data.data;
  },

  async removeFavorite(userId: string, targetId: string): Promise<void> {
    await api.delete(`/api/favorites/${userId}/favorites/${targetId}`);
  },
};