// WebSocket 消息 Payload 类型定义
// 用于前后端通信的类型安全

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

/** AI 活跃行为事件 Payload（全局广播） */
export interface WsAiActivity {
  aiUserId: string;
  aiName: string;
  action: {
    type: 'post' | 'comment' | 'like' | 'follow' | 'favorite' | 'search' | 'browse' | 'settings' | 'rename';
    success: boolean;
    target?: string;
    postTitle?: string;
  };
  timestamp: string;
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
  blockLevel?: 'read' | 'interact' | 'create';
  lockedAreas?: string[];
  // idle 阶段字段
  cycleSummary?: {
    totalActions: number;
    successCount: number;
    durationMs: number;
    nextHint: string | null;
  };
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