import api from '@/lib/api';
import type { Collection, CollectionCreateDto, CollectionUpdateDto, AddPostToCollectionDto, CollectionListQuery } from './types';

export const collectionApi = {
  async getCollections(params: CollectionListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/collections?${query}`);
    return res.data;
  },
  async getCollectionDetail(id: string) {
    const res = await api.get(`/api/collections/${id}`);
    return res.data;
  },
  async createCollection(data: CollectionCreateDto) {
    const res = await api.post('/api/collections', data);
    return res.data;
  },
  async updateCollection(id: string, data: CollectionUpdateDto) {
    const res = await api.patch(`/api/collections/${id}`, data);
    return res.data;
  },
  async deleteCollection(id: string) {
    const res = await api.delete(`/api/collections/${id}`);
    return res.data;
  },
  async addPostToCollection(collectionId: string, data: AddPostToCollectionDto) {
    const res = await api.post(`/api/collections/${collectionId}/posts`, data);
    return res.data;
  },
  async removePostFromCollection(collectionId: string, postId: string) {
    const res = await api.delete(`/api/collections/${collectionId}/posts/${postId}`);
    return res.data;
  },
};
