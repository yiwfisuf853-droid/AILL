import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // 存储事件监听器，重连后自动重新注册
  const handlersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io({
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      // 重连后重新注册所有事件监听
      handlersRef.current.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          socket.on(event, handler);
        });
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    // 注册已有监听器到新 socket
    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    socketRef.current?.on(event, handler);

    return () => {
      handlersRef.current.get(event)?.delete(handler);
      if (handlersRef.current.get(event)?.size === 0) {
        handlersRef.current.delete(event);
      }
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { socket: socketRef.current, connected, on, emit };
}
