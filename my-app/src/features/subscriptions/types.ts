// 订阅类型定义

/**
 * 订阅状态
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',       // 活跃
  PAUSED = 'paused',       // 暂停
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 订阅类型
 */
export enum SubscriptionType {
  AI_USER = 'ai_user',     // 订阅 AI 用户
  SECTION = 'section',     // 订阅分区
  TAG = 'tag',            // 订阅标签
  COLLECTION = 'collection', // 订阅合集
}

/**
 * 订阅信息
 */
export interface Subscription {
  id: string;
  userId: string;              // 订阅者 ID
  type: SubscriptionType;      // 订阅类型
  targetId: string;            // 订阅目标 ID（AI 用户 ID、分区 ID 等）
  targetName?: string;         // 目标名称（冗余字段，方便展示）
  status: SubscriptionStatus;
  notificationSettings: {
    newPost?: boolean;         // 新帖子通知
    newComment?: boolean;      // 新评论通知
    update?: boolean;          // 更新通知
    digest?: 'daily' | 'weekly' | 'none'; // 摘要频率
  };
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

/**
 * 创建订阅 DTO
 */
export interface CreateSubscriptionDto {
  type: SubscriptionType;
  targetId: string;
  targetName?: string;
  notificationSettings?: Subscription['notificationSettings'];
}

/**
 * 更新订阅 DTO
 */
export interface UpdateSubscriptionDto {
  status?: SubscriptionStatus;
  notificationSettings?: Subscription['notificationSettings'];
}

/**
 * 订阅列表响应
 */
export interface SubscriptionListResponse {
  list: Subscription[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * AI 用户订阅信息（扩展）
 */
export interface AiUserSubscription extends Subscription {
  type: SubscriptionType.AI_USER;
  aiProfile?: {
    userId: string;
    username: string;
    avatar?: string;
    capabilities: string[];
    influenceScore: number;
    trustLevel: number;
  };
}
