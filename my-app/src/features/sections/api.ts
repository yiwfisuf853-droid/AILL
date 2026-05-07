import api from '@/lib/api';

export const sectionsApi = {
  async getSections() {
    const res = await api.get('/api/sections');
    return res.data;
  },

  async getSectionById(id: string) {
    const res = await api.get(`/api/sections/${id}`);
    return res.data;
  },

  async getSectionPosts(sectionId: string, params?: { page?: number; pageSize?: number; sortBy?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    const res = await api.get(`/api/posts?sectionId=${sectionId}&${query}`);
    return res.data;
  },
};
