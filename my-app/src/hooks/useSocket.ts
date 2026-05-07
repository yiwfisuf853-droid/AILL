import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store';

// 全局单例 Socket — 多个 useSocket() 调用共享同一连接
let globalSocket: Socket | null = null;
let globalHandlers = new Map<string, Set<(...args: any[]) => void>>();
let connectionCount = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function createSocket(token: string): Socket {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    // 指数退避重连配置
    reconnection: true,
    reconnectionAttempts: 10,           // 最大重连次数
    reconnectionDelay: 1000,            // 初始延迟 1 秒
    reconnectionDelayMax: 32000,        // 最大延迟 32 秒
    randomizationFactor: 0.5,           // 随机抖动因子：实际延迟 = baseDelay * (0.5 + Math.random() * 0.5)
  });

  socket.on('connect', () => {
    console.log('[Socket] 已连接, id:', socket.id);
    // 重连后重新注册所有事件监听到新 socket 实例
    globalHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler);
      });
    });
    // 启动心跳（每 30 秒）
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        socket.emit('heartbeat', { userId, timestamp: new Date().toISOString() });
      }
    }, 30_000);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] 断开连接:', reason);
    // 停止心跳
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] 连接错误:', err.message);
  });

  return socket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      // 无 token 时断开全局 socket
      if (globalSocket) {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        globalSocket.disconnect();
        globalSocket = null;
      }
      setConnected(false);
      return;
    }

    // 如果已有连接且 token 一致，复用
    if (globalSocket && globalSocket.connected) {
      connectionCount++;
      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      globalSocket.on('connect', onConnect);
      globalSocket.on('disconnect', onDisconnect);
      setConnected(true);

      return () => {
        connectionCount--;
        globalSocket?.off('connect', onConnect);
        globalSocket?.off('disconnect', onDisconnect);
        if (connectionCount <= 0) {
          connectionCount = 0;
          globalSocket?.disconnect();
          globalSocket = null;
        }
      };
    }

    // 创建新连接
    connectionCount++;
    const socket = createSocket(token);
    globalSocket = socket;

    // 注册已有监听器到新 socket
    globalHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler);
      });
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setConnected(true);

    return () => {
      connectionCount--;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);

      if (connectionCount <= 0) {
        connectionCount = 0;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        socket.disconnect();
        globalSocket = null;
      }
    };
  }, [token]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!globalHandlers.has(event)) {
      globalHandlers.set(event, new Set());
    }
    globalHandlers.get(event)!.add(handler);

    globalSocket?.on(event, handler);

    return () => {
      globalHandlers.get(event)?.delete(handler);
      if (globalHandlers.get(event)?.size === 0) {
        globalHandlers.delete(event);
      }
      globalSocket?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    globalSocket?.emit(event, ...args);
  }, []);

  return { socket: globalSocket, connected, on, emit };
}