// WebSocket 消息 Payload 类型定义
// 用于前后端通信的类型安全

import type { AiAction, BlockLevel, CycleSummary } from '@/features/users/store';

// ============= Notification =============

/** 通知事件 Payload */
export interface WsNotification {
  type: 'like' | 'comment' | 'follow' | 'reward' | 'system';
  userId: string;
  username: string;
  targetType?: 'post' | 'comment' | 'user';
  targetId?: string;
  postTitle?: string;
  timestamp: string;
}

// ============= New Comment =============

/** 新评论事件 Payload */
export interface WsNewComment {
  postId: string;
  comment: {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    createdAt: string;
    parentId?: string;
  };
}

// ============= New Message =============

/** 新消息事件 Payload */
export interface WsNewMessage {
  conversationId: string;
  message: {
    id: string;
    senderId: string;
    senderUsername: string;
    content: string;
    createdAt: string;
    isRead?: boolean;
  };
}

// ============= Online Users =============

/** 在线用户列表事件 Payload */
export interface WsOnlineUsers {
  users: Array<{
    id: string;
    username: string;
    avatar?: string;
    isAi: boolean;
  }>;
  total: number;
}

// ============= AI Activity =============

/** AI 活跃行为事件 Payload（标准 actions 数组；兼容旧扁平字段） */
export interface WsAiActivity {
  aiUserId: string;
  aiName: string;
  timestamp: string;
  cycleId?: string;
  actions?: AiAction[];
  type?: string;
  actionType?: string;
  params?: Record<string, unknown>;
  reason?: string;
  result?: AiAction['result'];
  targetType?: string | null;
  targetId?: string | null;
  postId?: string | null;
  route?: string | null;
  uiIntent?: 'none' | 'navigate' | 'toast' | string | null;
  refreshKeys?: string[];
  displayText?: string;
  humanLikeStep?: string;
}

// ============= AI Liveness Status =============

/** AI 活跃状态事件 Payload（phase-based） */
export interface WsAiLivenessStatus {
  aiUserId: string;
  aiName: string;
  phase: 'thinking' | 'acting' | 'idle';
  cycleId: string;
  timestamp: string;
  // acting 阶段字段
  action?: string;
  params?: Record<string, unknown>;
  reason?: string;
  blockLevel?: BlockLevel;
  lockedAreas?: string[];
  humanLikeStep?: string;
  route?: string;
  uiIntent?: 'none' | 'navigate' | 'toast' | string;
  refreshKeys?: string[];
  displayText?: string;
  // idle 阶段字段
  cycleSummary?: CycleSummary;
}

// ============= Helper =============

/** WebSocket 事件名到 Payload 类型的映射 */
export type WsEventMap = {
  notification: WsNotification;
  'new-comment': WsNewComment;
  'new-message': WsNewMessage;
  'online-users': WsOnlineUsers;
  'ai-activity': WsAiActivity;
  'ai-liveness-status': WsAiLivenessStatus;
};

/** 获取事件对应的 Payload 类型 */
export type WsPayload<T extends keyof WsEventMap> = WsEventMap[T];
