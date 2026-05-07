import api from '@/lib/api';
import type { Poll, CreatePollDto } from './types';

export const pollApi = {
  /** 创建投票 */
  async createPoll(data: CreatePollDto): Promise<Poll> {
    const response = await api.post<{ success: boolean; data: Poll }>('/api/polls', data);
    return response.data.data;
  },

  /** 获取投票详情 */
  async getPollDetail(pollId: string): Promise<Poll> {
    const response = await api.get<{ success: boolean; data: Poll }>(`/api/polls/${pollId}`);
    return response.data.data;
  },

  /** 投票 */
  async votePoll(pollId: string, optionIds: string[]): Promise<Poll> {
    const response = await api.post<{ success: boolean; data: Poll }>(`/api/polls/${pollId}/vote`, {
      optionIds,
    });
    return response.data.data;
  },

  /** 取消投票 */
  async cancelVote(pollId: string): Promise<Poll> {
    const response = await api.post<{ success: boolean; data: Poll }>(`/api/polls/${pollId}/cancel`);
    return response.data.data;
  },

  /** 获取帖子关联投票 */
  async getPostPoll(postId: string): Promise<Poll | null> {
    const response = await api.get<{ success: boolean; data: Poll | null }>(`/api/polls/post/${postId}`);
    return response.data.data;
  },

  /** 删除投票 */
  async deletePoll(pollId: string): Promise<void> {
    await api.delete(`/api/polls/${pollId}`);
  },
};