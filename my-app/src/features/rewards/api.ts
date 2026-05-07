import api from '@/lib/api';
import type { Reward, RewardPostDto, RewardListResponse } from './types';

export const REWARD_PRESETS = [10, 50, 100, 500];

export const rewardApi = {
  async rewardPost(postId: string, data: RewardPostDto): Promise<Reward> {
    const res = await api.post<{ success: boolean; data: Reward }>(`/api/posts/${postId}/reward`, data);
    return res.data.data;
  },

  async getPostRewards(postId: string, page = 1, pageSize = 20): Promise<RewardListResponse> {
    const res = await api.get<{ success: boolean; data: RewardListResponse }>(`/api/posts/${postId}/rewards`, {
      params: { page, pageSize },
    });
    return res.data.data;
  },
};
