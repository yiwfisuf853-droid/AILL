import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { notificationApi, type Notification } from '../api';
import { IconNotification, IconHeart, IconComment, IconUser, IconDelete, IconCheck, IconChevronLeft } from '@/components/ui/icon';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  like: { icon: IconHeart, color: 'text-red-400', bg: 'bg-red-500/10' },
  comment: { icon: IconComment, color: 'text-primary', bg: 'bg-primary/10' },
  follow: { icon: IconUser, color: 'text-[hsl(160,70%,50%)]', bg: 'bg-[hsl(160,70%,45%)]/10' },
  system: { icon: IconNotification, color: 'text-accent', bg: 'bg-accent/10' },
};

export function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetch = useCallback(async (p = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications(user.id, { page: p, limit: 20, ...(filter === 'unread' ? { isRead: false } : {}) });
      setNotifications(prev => p === 1 ? (res.list || []) : [...prev, ...(res.list || [])]);
      setHasMore(res.hasMore || false);
      setPage(p);
    } catch {} finally { setLoading(false); }
  }, [user, filter]);

  useEffect(() => { fetch(1); }, [fetch]);

  const handleMarkRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationApi.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = async (id: string) => {
    await notificationApi.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getLink = (n: Notification) => {
    if (n.targetType === 'post' && n.targetId) return `/posts/${n.targetId}`;
    if (n.targetType === 'user' && n.targetId) return `/users/${n.targetId}`;
    if (n.sourceUser) return `/users/${n.sourceUser.id}`;
    return '#';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="py-4" data-name="notificationsPage">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="notificationsPage.header">
        <button onClick={() => window.history.back()} data-name="notificationsPage.backBtn" className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="section-header-bar bg-primary" />
        <h1 className="text-lg font-bold text-foreground" data-name="notificationsPage.title">通知</h1>
        {unreadCount > 0 && (
          <span className="chip bg-primary/10 text-primary text-[10px]" data-name="notificationsPage.unreadBadge">{unreadCount} 未读</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} data-name="notificationsPage.markAllReadBtn" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              <IconCheck size={12} /> 全部已读
            </button>
          )}
          <button onClick={() => setFilter(f => f === 'all' ? 'unread' : 'all')}
            data-name="notificationsPage.filterBtn"
            className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
              filter === 'unread' ? 'bg-primary/10 text-primary' : 'text-foreground-tertiary hover:text-foreground bg-muted/40'
            }`}>
            {filter === 'all' ? '全部' : '未读'}
          </button>
        </div>
      </div>

      {!notifications.length && !loading ? (
        <div className="surface-panel p-16 text-center text-foreground-tertiary" data-name="notificationsPage.emptyState">
          <IconNotification size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-1.5" data-name="notificationsPage.list">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const Icon = cfg.icon;
            return (
              <Link key={n.id} to={getLink(n)}
                data-name={`notificationsPage.item.${n.id}`}
                onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                className={`surface-panel flex items-start gap-3 p-3.5 group hover:border-border-hover ${
                  !n.isRead ? 'border-primary/20 bg-primary/[0.02]' : ''
                }`}>
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`} data-name={`notificationsPage.item.${n.id}.icon`}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${n.isRead ? 'text-foreground-secondary' : 'text-foreground'}`} data-name={`notificationsPage.item.${n.id}.type`}>
                      {n.typeName || n.type}
                    </span>
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" data-name={`notificationsPage.item.${n.id}.unreadDot`} />}
                  </div>
                  {n.content && <p className="text-[11px] text-foreground-tertiary mt-0.5 line-clamp-2" data-name={`notificationsPage.item.${n.id}.content`}>{n.content}</p>}
                  <span className="text-[10px] text-foreground-tertiary/60 mt-1 block" data-name={`notificationsPage.item.${n.id}.date`}>{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <button onClick={e => { e.preventDefault(); handleDelete(n.id); }}
                  data-name={`notificationsPage.item.${n.id}.deleteBtn`}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-foreground-tertiary hover:text-destructive transition-all p-1">
                  <IconDelete size={13} />
                </button>
              </Link>
            );
          })}
          {hasMore && (
            <button onClick={() => fetch(page + 1)} disabled={loading}
              data-name="notificationsPage.loadMoreBtn"
              className="w-full py-2.5 rounded-lg border border-border/60 text-xs text-foreground-secondary hover:text-foreground hover:border-border transition-colors">
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
