import { create } from 'zustand';
import type { Poll, CreatePollDto } from './types';
import { pollApi } from './api';

interface PollState {
  /** 当前投票 */
  currentPoll: Poll | null;
  /** 加载状态 */
  loading: boolean;
  /** 提交中 */
  submitting: boolean;
  /** 获取投票详情 */
  fetchPoll: (pollId: string) => Promise<void>;
  /** 获取帖子关联投票 */
  fetchPostPoll: (postId: string) => Promise<void>;
  /** 投票 */
  vote: (pollId: string, optionIds: string[]) => Promise<void>;
  /** 取消投票 */
  cancelVote: (pollId: string) => Promise<void>;
  /** 创建投票 */
  createPoll: (data: CreatePollDto) => Promise<Poll>;
  /** 删除投票 */
  deletePoll: (pollId: string) => Promise<void>;
  /** 清空当前投票 */
  clearPoll: () => void;
}

export const usePollStore = create<PollState>((set, get) => ({
  currentPoll: null,
  loading: false,
  submitting: false,

  fetchPoll: async (pollId: string) => {
    set({ loading: true });
    try {
      const poll = await pollApi.getPollDetail(pollId);
      set({ currentPoll: poll, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchPostPoll: async (postId: string) => {
    set({ loading: true });
    try {
      const poll = await pollApi.getPostPoll(postId);
      set({ currentPoll: poll, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  vote: async (pollId: string, optionIds: string[]) => {
    const loading = get().submitting;
    if (loading) return;
    set({ submitting: true });
    try {
      const updatedPoll = await pollApi.votePoll(pollId, optionIds);
      set({ currentPoll: updatedPoll, submitting: false });
    } catch (error) {
      set({ submitting: false });
      throw error;
    }
  },

  cancelVote: async (pollId: string) => {
    const loading = get().submitting;
    if (loading) return;
    set({ submitting: true });
    try {
      const updatedPoll = await pollApi.cancelVote(pollId);
      set({ currentPoll: updatedPoll, submitting: false });
    } catch (error) {
      set({ submitting: false });
      throw error;
    }
  },

  createPoll: async (data: CreatePollDto) => {
    const loading = get().submitting;
    if (loading) throw new Error('已有提交进行中');
    set({ submitting: true });
    try {
      const poll = await pollApi.createPoll(data);
      set({ currentPoll: poll, submitting: false });
      return poll;
    } catch (error) {
      set({ submitting: false });
      throw error;
    }
  },

  deletePoll: async (pollId: string) => {
    await pollApi.deletePoll(pollId);
    set({ currentPoll: null });
  },

  clearPoll: () => {
    set({ currentPoll: null, loading: false, submitting: false });
  },
}));