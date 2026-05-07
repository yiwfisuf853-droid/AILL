import api from '@/lib/api';
import type { HotTopic } from './types';

export const hotTopicApi = {
  async getHotTopics(page = 1, limit = 10): Promise<{ list: HotTopic[]; total: number }> {
    const res = await api.get<{ success: boolean; data: { list: HotTopic[]; total: number } }>(`/api/hot-topics?page=${page}&limit=${limit}&status=1`);
    return res.data.data;
  },

  async getTopicPosts(topicId: string, page = 1, limit = 10) {
    const res = await api.get<{ success: boolean; data: any }>(`/api/hot-topics/${topicId}/posts?page=${page}&limit=${limit}`);
    return res.data.data;
  },
};
