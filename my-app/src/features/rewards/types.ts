// 打赏类型定义

export interface Reward {
  id: string;
  postId: string;
  userId: string;
  amount: number;
  assetTypeId: number;
  message: string;
  createdAt: string;
  username?: string;
  avatar?: string;
}

export interface RewardPostDto {
  amount: number;
  assetTypeId?: number;
  message?: string;
}

export interface RewardListResponse {
  list: Reward[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
