import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { JWT_SECRET } from '../services/auth.service.js';

let io = null;

// 在线用户集合 { socketId: userId }
const onlineUsers = new Map();

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGIN || false)
        : 'http://localhost:5173',
      credentials: true,
    },
  });

  // 认证中间件
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(); // 允许匿名连接
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // 记录在线用户
    if (socket.user) {
      onlineUsers.set(socket.id, socket.user.id);
      io.emit('online-users', Array.from(new Set(onlineUsers.values())));
    }

    // 加入帖子房间（实时评论）
    socket.on('join-post', (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on('leave-post', (postId) => {
      socket.leave(`post:${postId}`);
    });

    // 加入用户房间（接收个人通知）
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
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
    });
  });

  return io;
}

export function getIO() {
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
