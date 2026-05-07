import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { JWT_SECRET } from '../services/auth.service.js';
import { stopLivenessBySocket, bindLivenessSocket } from '../services/ai-liveness.service.js';

let io = null;

// 在线用户集合 { socketId: userId }
const onlineUsers = new Map();

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGIN || false)
        : ['http://localhost:5173', 'http://localhost:3721'],
      credentials: true,
    },
  });

  // 认证中间件（SEC-15: 必须认证，禁止匿名连接）
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('未授权，请先登录'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (e) {
      console.warn('[WS] JWT auth failed:', e.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // 记录在线用户
    if (socket.user) {
      onlineUsers.set(socket.id, socket.user.id);
      io.emit('online-users', Array.from(new Set(onlineUsers.values())));

      // ===== 自动加入全局房间 =====
      // 所有已认证用户自动加入 community 房间（全局广播）
      socket.join('community');

      // 管理员自动加入 admin 房间
      if (socket.user.role === 'admin' || socket.user.is_admin) {
        socket.join('admin');
      }
    }

    // ===== community 房间事件 =====
    socket.on('join-community', () => {
      socket.join('community');
    });

    socket.on('leave-community', () => {
      socket.leave('community');
    });

    // ===== admin 房间事件 =====
    socket.on('join-admin', () => {
      // 验证是否为管理员
      if (socket.user && (socket.user.role === 'admin' || socket.user.is_admin)) {
        socket.join('admin');
      }
    });

    socket.on('leave-admin', () => {
      socket.leave('admin');
    });

    // 加入帖子房间（实时评论）
    socket.on('join-post', (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on('leave-post', (postId) => {
      socket.leave(`post:${postId}`);
    });

    // 加入会话房间（私信）
    socket.on('join-conversation', (conversationId) => {
      if (socket.user && conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave-conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // 转发私信消息给会话房间其他成员
    socket.on('send-message', ({ conversationId, message }) => {
      if (socket.user && conversationId && message) {
        socket.to(`conversation:${conversationId}`).emit('new-message', { conversationId, message });
      }
    });

    // 加入用户房间（接收个人通知）
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      // AI 用户连接时绑定 socketId 到活跃循环
      if (socket.user.isAi) {
        bindLivenessSocket(socket.user.id, socket.id);
      }
    }

    // 心跳（在线状态）
    socket.on('heartbeat', () => {
      if (socket.user) {
        onlineUsers.set(socket.id, socket.user.id);
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online-users', Array.from(new Set(onlineUsers.values())));

      // AI 用户断连：延迟 60 秒缓冲窗口，期间如重连则取消停止
      if (socket.user?.isAi) {
        const aiUserId = socket.user.id;
        const disconnectSocketId = socket.id;

        // 设置 60 秒缓冲定时器
        const graceTimer = setTimeout(async () => {
          // 检查该 AI 是否已有新的 WS 连接（重连成功）
          let hasNewConnection = false;
          for (const [sid, uid] of onlineUsers.entries()) {
            if (uid === aiUserId && sid !== disconnectSocketId) {
              hasNewConnection = true;
              break;
            }
          }

          if (!hasNewConnection) {
            // 缓冲期内无重连，执行停止
            const autoStopEnabled = process.env.AI_LIVENESS_AUTO_STOP !== 'false';
            if (autoStopEnabled) {
              stopLivenessBySocket(disconnectSocketId);
            }
          }
        }, 60 * 1000); // 60 秒缓冲

        // 将定时器挂在 socket 上以便清理（虽然 disconnect 后 socket 已失效，但闭包持有引用）
        socket._livenessGraceTimer = graceTimer;
      }
    });
  });

  return io;
}

export function getWebSocketInstance() {
  return io;
}

export function getOnlineUsers() {
  return Array.from(new Set(onlineUsers.values()));
}

// ===== 事件发射器 =====

/** 向指定用户发送通知 */
export function emitNotification(userId, notification) {
  if (io) io.to(`user:${userId}`).emit('notification', notification);
}

/** 向帖子房间广播新评论 */
export function emitNewComment(postId, comment) {
  if (io) io.to(`post:${postId}`).emit('new-comment', { postId, comment });
}

/** 向会话参与者发送新消息 */
export function emitNewMessage(conversationId, message) {
  if (io) io.to(`conversation:${conversationId}`).emit('new-message', { conversationId, message });
}

/** 加入会话房间 */
export function joinConversation(socketId, conversationId) {
  if (io) io.sockets.sockets.get(socketId)?.join(`conversation:${conversationId}`);
}

/** 向 community 房间广播（所有在线用户） */
export function emitToCommunity(event, data) {
  if (io) io.to('community').emit(event, data);
}

/** 向 admin 房间广播（仅管理员） */
export function emitToAdmin(event, data) {
  if (io) io.to('admin').emit(event, data);
}
