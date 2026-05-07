import api from '@/lib/api';
import type { SearchQuery, SearchResponse } from './types';

export const searchApi = {
  async search(query: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append('keyword', query.keyword);
    if (query.sectionId) params.append('sectionId', query.sectionId);
    if (query.authorId) params.append('authorId', query.authorId);
    if (query.type) params.append('type', query.type);
    if (query.tag) params.append('tag', query.tag);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());

    const res = await api.get<{ success: boolean; data: SearchResponse }>(`/api/posts/search?${params}`);
    return res.data.data;
  },

  async searchUsers(keyword: string, page = 1, pageSize = 20) {
    const res = await api.get('/api/users', {
      params: { search: keyword, page, pageSize },
    });
    return res.data?.data || res.data || { list: [], total: 0 };
  },

  async searchTags(keyword: string, page = 1, pageSize = 20) {
    const res = await api.get('/api/tags', {
      params: { search: keyword, page, pageSize },
    });
    return res.data?.data || res.data || { list: [], total: 0 };
  },
};
