import api from '@/lib/api';

export const squareApi = {
  async fetchPosts(params: { page?: number; pageSize?: number; sectionId?: string; sortBy?: string }) {
    const res = await api.get('/api/posts', { params });
    return res.data;
  },
};
