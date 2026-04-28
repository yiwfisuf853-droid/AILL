import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { emitNewMessage } from '../lib/websocket.js';

/**
 * 创建会话
 */
export async function createConversation(type, participantIds) {
  // 检查是否已存在相同的单聊会话
  if (type === 1 && participantIds.length === 2) {
    const participants = await repo.findAll('conversation_participants', {
      where: { userId: participantIds[0] },
      orderBy: 'joined_at DESC',
    });
    const existingConvIds = participants.map(p => p.conversationId);

    if (existingConvIds.length > 0) {
      for (const convId of existingConvIds) {
        const conv = await repo.findById('conversations', convId);
        if (!conv || conv.type !== 1) continue;

        const parts = await repo.findAll('conversation_participants', {
          where: { conversationId: convId },
          orderBy: 'joined_at DESC',
        });
        const partUserIds = parts.map(p => p.userId);
        if (partUserIds.includes(participantIds[0]) && partUserIds.includes(participantIds[1])) {
          return { success: true, conversation: conv, exists: true };
        }
      }
    }
  }

  const conversation = await repo.insert('conversations', {
    id: generateId(),
    type,
    createdAt: new Date().toISOString(),
  });

  for (const userId of participantIds) {
    await repo.insert('conversation_participants', {
      id: generateId(),
      conversationId: conversation.id,
      userId,
      joinedAt: new Date().toISOString(),
    });
  }

  return { success: true, conversation, exists: false };
}

/**
 * 获取会话列表
 */
export async function getConversations(userId) {
  const participants = await repo.findAll('conversation_participants', {
    where: { userId },
    orderBy: 'joined_at DESC',
  });

  const conversationIds = participants.map(p => p.conversationId);
  if (conversationIds.length === 0) {
    return { total: 0, list: [] };
  }

  // 获取所有会话
  const conversations = [];
  for (const convId of conversationIds) {
    const conv = await repo.findById('conversations', convId);
    if (conv && !conv.deletedAt) {
      conversations.push(conv);
    }
  }

  const list = [];
  for (const c of conversations) {
    const parts = await repo.findAll('conversation_participants', {
      where: { conversationId: c.id },
      orderBy: 'joined_at DESC',
    });

    const otherParticipants = [];
    for (const p of parts) {
      if (p.userId === userId) continue;
      const user = await repo.findById('users', p.userId);
      if (user) {
        otherParticipants.push({
          id: user.id,
          username: user.username,
          nickname: user.username,
          avatar: user.avatar,
          isAi: user.isAi,
        });
      }
    }

    // 获取最后一条消息
    const messages = await repo.findAll('messages', {
      where: { conversationId: c.id },
      orderBy: 'created_at DESC',
      limit: 1,
    });
    const lastMessage = messages.length > 0 ? messages[0] : null;

    // 计算未读数
    const unreadMessages = await repo.findAll('messages', {
      where: { conversationId: c.id, isRead: 0 },
    });
    const unreadCount = unreadMessages.filter(m => m.senderId !== userId).length;

    list.push({
      id: c.id,
      type: c.type,
      typeName: c.type === 1 ? '单聊' : '群聊',
      participants: otherParticipants,
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        contentType: lastMessage.type,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
      } : null,
      unreadCount,
      updatedAt: lastMessage?.createdAt || c.createdAt,
    });
  }

  // 按最后更新时间排序
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return { total: list.length, list };
}

/**
 * 获取会话详情
 */
export async function getConversationDetail(userId, conversationId) {
  const conversation = await repo.findById('conversations', conversationId);
  if (!conversation || conversation.deletedAt) {
    throw new NotFoundError('会话不存在');
  }

  // 检查是否是参与者
  const participant = await repo.findOne('conversation_participants', {
    conversationId,
    userId,
  });
  if (!participant) {
    throw new ForbiddenError('无权访问该会话');
  }

  const parts = await repo.findAll('conversation_participants', {
    where: { conversationId: conversationId },
    orderBy: 'joined_at DESC',
  });

  const participantUsers = [];
  for (const p of parts) {
    if (p.deletedAt) continue;
    const user = await repo.findById('users', p.userId);
    if (user) {
      participantUsers.push({
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        avatar: user.avatar,
        isAi: user.isAi,
      });
    }
  }

  return {
    id: conversation.id,
    type: conversation.type,
    typeName: conversation.type === 1 ? '单聊' : '群聊',
    participants: participantUsers,
    createdAt: conversation.createdAt,
    lastMessageAt: conversation.lastMessageAt,
  };
}

/**
 * 发送消息
 */
export async function sendMessage(userId, conversationId, content, contentType = 1) {
  const conversation = await repo.findById('conversations', conversationId);
  if (!conversation || conversation.deletedAt) {
    throw new NotFoundError('会话不存在');
  }

  // 检查是否是参与者
  const participant = await repo.findOne('conversation_participants', {
    conversationId,
    userId,
  });
  if (!participant) {
    throw new ForbiddenError('无权在该会话中发送消息');
  }

  const message = await repo.insert('messages', {
    id: generateId(),
    conversationId,
    senderId: userId,
    content,
    type: contentType,
    isRead: 0,
    createdAt: new Date().toISOString(),
  });

  // 更新会话最后消息
  await repo.update('conversations', conversationId, {
    lastMessage: content,
    lastMessageAt: new Date().toISOString(),
  });

  // 更新参与者未读计数
  await repo.update('conversation_participants', participant.id, {
    unreadCount: 0,
  });

  // 通过 WebSocket 发送新消息
  emitNewMessage(conversationId, message);

  return { success: true, message };
}

/**
 * 获取消息列表
 */
export async function getMessages(conversationId, options = {}) {
  const { page = 1, limit = 50 } = options;

  const result = await repo.findAll('messages', {
    where: { conversationId: conversationId },
    page,
    limit,
    orderBy: 'created_at ASC',
  });

  const list = [];
  for (const m of result.list) {
    const sender = await repo.findById('users', m.senderId);
    list.push({
      id: m.id,
      senderId: m.senderId,
      senderName: sender?.username || '未知',
      senderAvatar: sender?.avatar,
      content: m.content,
      contentType: m.type,
      isRead: m.isRead,
      createdAt: m.createdAt,
    });
  }

  return {
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: page * limit < result.total,
    list,
  };
}
