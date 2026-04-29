import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { notificationApi, type Notification } from '../api';
import { IconNotification, IconHeart, IconComment, IconUser, IconDelete, IconCheck, IconChevronLeft, IconCampaign, IconBookmark } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  '1': { icon: IconHeart, color: 'text-red-400', bg: 'bg-red-500/10' },
  '2': { icon: IconComment, color: 'text-primary', bg: 'bg-primary/10' },
  '3': { icon: IconUser, color: 'text-[hsl(160,70%,50%)]', bg: 'bg-[hsl(160,70%,45%)]/10' },
  '4': { icon: IconNotification, color: 'text-accent', bg: 'bg-accent/10' },
  '5': { icon: IconCampaign, color: 'text-[hsl(28,90%,56%)]', bg: 'bg-[hsl(28,90%,56%)]/10' },
  '6': { icon: IconBookmark, color: 'text-[hsl(220,70%,55%)]', bg: 'bg-[hsl(220,70%,55%)]/10' },
};

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: '1', label: '点赞' },
  { key: '2', label: '评论' },
  { key: '3', label: '关注' },
  { key: '4', label: '系统' },
  { key: '5', label: '活动' },
  { key: '6', label: '订阅' },
] as const;

export function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const pageSize = 20;

  const fetch = useCallback(async (p = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, limit: pageSize };
      if (readFilter === 'unread') params.isRead = false;
      if (typeFilter !== 'all') params.type = Number(typeFilter);

      const res = await notificationApi.getNotifications(user.id, params);
      setNotifications(res.list || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch {} finally { setLoading(false); }
  }, [user, typeFilter, readFilter]);

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
    setTotal(prev => prev - 1);
  };

  const getLink = (n: Notification) => {
    if (n.targetType === '1' && n.targetId) return `/posts/${n.targetId}`;
    if (n.targetType === '2' && n.targetId) return `/posts/${n.targetId}`;
    if (n.targetType === '3' && n.targetId) return `/users/${n.targetId}`;
    if (n.sourceUser) return `/users/${n.sourceUser.id}`;
    return '#';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="py-4" data-name="notifications">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="notificationsHeader">
        <button onClick={() => window.history.back()} data-name="notificationsBackBtn" className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="sectionHeaderBar bg-primary" />
        <h1 className="text-lg font-bold text-foreground" data-name="notificationsTitle">通知</h1>
        {unreadCount > 0 && (
          <span className="inlineChip bg-primary/10 text-primary text-xs" data-name="notificationsUnreadBadge">{unreadCount} 未读</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} data-name="notificationsMarkAllReadBtn" className="text-xs text-primary hover:underline flex items-center gap-1">
              <IconCheck size={12} /> 全部已读
            </button>
          )}
          <button onClick={() => setReadFilter(f => f === 'all' ? 'unread' : 'all')}
            data-name="notificationsFilterBtn"
            className={cn(
              "text-xs px-2.5 py-1 rounded-md transition-colors",
              readFilter === 'unread' ? 'bg-primary/10 text-primary' : 'text-foreground-tertiary hover:text-foreground bg-muted/40'
            )}>
            {readFilter === 'all' ? '全部' : '未读'}
          </button>
        </div>
      </div>

      {/* 类型筛选 Tab */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1" data-name="notificationsTypeTabs">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            data-name={`notificationsTypeTab${tab.key}`}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              typeFilter === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-tertiary hover:text-foreground bg-muted/30'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!notifications.length && !loading ? (
        <div className="surfacePanel p-16 text-center text-foreground-tertiary" data-name="notificationsEmptyState">
          <IconNotification size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-1.5" data-name="notificationsList">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['4'];
            const Icon = cfg.icon;
            return (
              <Link key={n.id} to={getLink(n)}
                data-name={`notificationsItem${n.id}`}
                onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                className={cn(
                  'surfacePanel flex items-start gap-3 p-3.5 group hover:border-border-hover',
                  !n.isRead ? 'border-primary/20 bg-primary/[0.02]' : ''
                )}>
                <div className={cn('shrink-0 w-7 h-7 rounded-lg flex items-center justify-center', cfg.bg)} data-name={`notificationsItem${n.id}Icon`}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0" data-name={`notificationsItem${n.id}Content`}>
                  <div className="flex items-center gap-2" data-name={`notificationsItem${n.id}TypeRow`}>
                    <span className={cn('text-xs font-medium', n.isRead ? 'text-foreground-secondary' : 'text-foreground')} data-name={`notificationsItem${n.id}Type`}>
                      {n.typeName || n.type}
                    </span>
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" data-name={`notificationsItem${n.id}UnreadDot`} />}
                  </div>
                  {n.content && <p className="text-xs text-foreground-tertiary mt-0.5 line-clamp-2" data-name={`notificationsItem${n.id}Content`}>{n.content}</p>}
                  <span className="text-xs text-foreground-tertiary/60 mt-1 block" data-name={`notificationsItem${n.id}Date`}>{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <button onClick={e => { e.preventDefault(); handleDelete(n.id); }}
                  data-name={`notificationsItem${n.id}DeleteBtn`}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-foreground-tertiary hover:text-destructive transition-all p-1">
                  <IconDelete size={13} />
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <div className="mt-6 flex justify-center" data-name="notificationsPagination">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={(p) => fetch(p)}
          />
        </div>
      )}
    </div>
  );
}
