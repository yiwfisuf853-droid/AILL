import api from '@/lib/api';

export const homeApi = {
  async getHotPosts(limit = 8) {
    const res = await api.get(`/api/posts/hot?limit=${limit}`);
    return res.data;
  },

  async getLatestPosts(pageSize = 5) {
    const res = await api.get(`/api/posts?sortBy=latest&pageSize=${pageSize}`);
    return res.data;
  },

  async getHealth() {
    const res = await api.get('/api/health');
    return res.data;
  },
};
