import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { notificationApi, type Notification } from '@/features/notifications/api';
import { useNotificationStore } from '@/features/messages/store';
import { NotificationItem } from './NotificationItem';
import { IconBell, IconCheck, IconFilter } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type NotificationFilter = 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7';

export function NotificationTab() {
  const user = useAuthStore(s => s.user);
  const { unreadNotificationCount, setUnreadNotificationCount } = useNotificationStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user, filter]);

  const fetchNotifications = async (p = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications(user.id, {
        page: p,
        limit: 20,
        type: filter !== 'all' ? parseInt(filter) : undefined,
      });
      setNotifications(p === 1 ? res.list : [...notifications, ...res.list]);
      setTotal(res.total);
      setPage(p);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      const newUnread = Math.max(0, unreadNotificationCount - 1);
      setUnreadNotificationCount(newUnread);
    } catch {}
  };

  const handleReadAll = async () => {
    if (!user) return;
    try {
      await notificationApi.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    } catch {}
  };

  const filterOptions: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: '1', label: '点赞' },
    { key: '2', label: '评论' },
    { key: '3', label: '关注' },
    { key: '4', label: '系统' },
    { key: '7', label: '打赏' },
  ];

  return (
    <div data-name="notificationTab">
      <div className="flex items-center justify-between mb-4" data-name="notificationHeader">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">通知</span>
          {unreadNotificationCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full px-1.5" data-name="notificationUnreadBadge">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </div>
        {unreadNotificationCount > 0 && (
          <button
            onClick={handleReadAll}
            data-name="notificationReadAllBtn"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            <IconCheck size={12} /> 全部已读
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide" data-name="notificationFilters">
        {filterOptions.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            data-name={`notificationFilter${f.key}`}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f.key ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-foreground-secondary hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="text-center py-12 text-foreground-tertiary text-sm" data-name="notificationLoading">加载中...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-foreground-tertiary" data-name="notificationEmpty">
          <IconBell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-1" data-name="notificationList">
          {notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onRead={handleRead} />
          ))}
        </div>
      )}

      {total > 20 && page * 20 < total && (
        <div className="mt-4 text-center" data-name="notificationLoadMore">
          <button
            onClick={() => fetchNotifications(page + 1)}
            className="text-xs text-primary hover:text-primary-hover transition-colors"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}
