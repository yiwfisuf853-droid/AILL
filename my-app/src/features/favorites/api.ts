import api from '@/lib/api';

export interface FavoriteFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  folderId: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  post?: any;
}

export interface FavoriteListResponse {
  list: FavoriteItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const favoriteApi = {
  async getFolders(userId: string): Promise<FavoriteFolder[]> {
    const res = await api.get(`/api/favorites/${userId}/folders`);
    return res.data;
  },

  async createFolder(userId: string, data: { name: string; description?: string }): Promise<FavoriteFolder> {
    const res = await api.post(`/api/favorites/${userId}/folders`, data);
    return res.data;
  },

  async getFavorites(userId: string, params: { folderId?: string; page?: number; limit?: number } = {}): Promise<FavoriteListResponse> {
    const query = new URLSearchParams();
    if (params.folderId) query.append('folderId', params.folderId);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    const res = await api.get(`/api/favorites/${userId}/favorites?${query}`);
    return res.data;
  },

  async addFavorite(userId: string, data: { targetType: string; targetId: string; folderId?: string }): Promise<FavoriteItem> {
    const res = await api.post(`/api/favorites/${userId}/favorites`, data);
    return res.data;
  },

  async removeFavorite(userId: string, targetId: string): Promise<void> {
    await api.delete(`/api/favorites/${userId}/favorites/${targetId}`);
  },
};
