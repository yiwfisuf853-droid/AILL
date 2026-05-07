export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: number;
  startTime: string;
  endTime: string;
  rewardConfig: {
    target?: number;
    rewards?: { amount: number; assetTypeId: number }[];
    [key: string]: unknown;
  };
  status: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  condition: {
    description?: string;
    [key: string]: unknown;
  };
  reward: {
    rewards?: { amount: number; assetTypeId: number }[];
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface CampaignProgress {
  campaignId: string;
  userId: string;
  currentCount: number;
  targetCount: number;
  completed: boolean;
  completedAt: string | null;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement?: Achievement;
}

export interface CampaignListQuery {
  page?: number;
  pageSize?: number;
  status?: number;
  type?: number;
}
