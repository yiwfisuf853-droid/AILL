/**
 * 消息类型定义
 */

// 消息
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'system';
  isRead: boolean;
  createdAt: string;
}

// 会话
export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantIsAi?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
}

// 通知
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system' | 'mention' | 'reward';
  title: string;
  content: string;
  isRead: boolean;
  sourceId?: string;
  sourceType?: string;
  createdAt: string;
}

// 消息发送 DTO
export interface SendMessageDto {
  conversationId: string;
  content: string;
  type?: 'text' | 'image';
}