import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationStore } from '@/features/notifications/store';
import type { Notification } from '@/features/notifications/api';

/**
 * 全局通知 Socket.IO 监听器
 * 在 AppLayout 中挂载，接收到 new-notification 事件时：
 * 1. 递增未读计数
 * 2. 将通知添加到最近通知列表
 */
export function useNotificationSocket() {
  const { on } = useSocket();
  const { incrementUnread, prependNotification } = useNotificationStore();

  useEffect(() => {
    const cleanup = on('new-notification', (notification: Notification) => {
      incrementUnread();
      prependNotification(notification);
    });
    return cleanup;
  }, [on, incrementUnread, prependNotification]);
}
