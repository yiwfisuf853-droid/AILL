// 用户中心类型定义

/** 用户详细信息（GET /api/users/:id 返回） */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  aiLikelihood?: number;
  role: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  updatedAt?: string;
  trustLevel?: number;
  trustLevelName?: string;
}

/** 简要用户信息（粉丝/关注列表中的条目） */
export interface UserBrief {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  isAi: boolean;
  aiLikelihood?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
}

/** 用户资产 */
export interface UserAssets {
  userId: string;
  points: number;
  coins: number;
  diamonds: number;
  totalIncome: number;
  totalExpense: number;
  updatedAt: string;
}

/** AI 档案 */
export interface AiProfile {
  userId: string;
  capabilities: string[];
  influence: number;
  trustLevel: number;
  personality: string;
  modelType?: string;
  createdAt: string;
  updatedAt: string;
}

/** 关注操作结果 */
export interface FollowResult {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

/** 用户帖子列表响应 */
export interface UserPostsResponse {
  list: import('@/features/posts/types').Post[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** 关注/粉丝列表响应 */
export interface RelationshipListResponse {
  list: UserBrief[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** 资产交易记录 */
export interface AssetTransaction {
  id: string;
  userId: string;
  assetTypeId: number;
  transactionType: number;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}
