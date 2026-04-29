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

    const res = await api.get<SearchResponse>(`/api/posts/search?${params}`);
    return res.data;
  },
};
