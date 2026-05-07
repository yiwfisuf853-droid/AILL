/**
 * 投票类型定义
 */

/** 投票类型 */
export type PollType = 'single' | 'multi';

/** 投票选项 */
export interface PollOption {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  votedByUser: boolean;
}

/** 投票详情 */
export interface Poll {
  id: string;
  title: string;
  description: string | null;
  postId: string | null;
  userId: string;
  pollType: PollType;
  isAnonymous: boolean;
  isExpired: boolean;
  startedAt: string;
  endedAt: string | null;
  totalVoters: number;
  userVoted: boolean;
  options: PollOption[];
  createdAt: string;
  updatedAt: string;
}

/** 创建投票 DTO */
export interface CreatePollDto {
  title: string;
  description?: string;
  postId?: string;
  pollType?: PollType;
  isAnonymous?: boolean;
  endedAt?: string;
  options: (string | { text: string })[];
}

/** 投票请求 DTO */
export interface VotePollDto {
  optionIds: string[];
}