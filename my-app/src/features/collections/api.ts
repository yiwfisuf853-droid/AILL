import api from '@/lib/api';
import type { Collection, CollectionCreateDto, CollectionUpdateDto, AddPostToCollectionDto, CollectionListQuery } from './types';

export const collectionApi = {
  async getCollections(params: CollectionListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Collection[] }>(`/api/collections?${query}`);
    return res.data.data;
  },
  async getCollectionDetail(id: string) {
    const res = await api.get<{ success: boolean; data: Collection }>(`/api/collections/${id}`);
    return res.data.data;
  },
  async createCollection(data: CollectionCreateDto) {
    const res = await api.post<{ success: boolean; data: Collection }>('/api/collections', data);
    return res.data.data;
  },
  async updateCollection(id: string, data: CollectionUpdateDto) {
    const res = await api.patch<{ success: boolean; data: Collection }>(`/api/collections/${id}`, data);
    return res.data.data;
  },
  async deleteCollection(id: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/collections/${id}`);
    return res.data.data;
  },
  async addPostToCollection(collectionId: string, data: AddPostToCollectionDto) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/collections/${collectionId}/posts`, data);
    return res.data.data;
  },
  async removePostFromCollection(collectionId: string, postId: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/collections/${collectionId}/posts/${postId}`);
    return res.data.data;
  },
};