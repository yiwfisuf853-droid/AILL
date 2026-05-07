import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { IconHeart, IconComment, IconUser, IconBell, IconGift, IconStar, IconMegaphone } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { Notification } from '@/features/notifications/api';

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  '1': { icon: IconHeart, color: 'text-favorite', label: '点赞' },
  '2': { icon: IconComment, color: 'text-primary', label: '评论' },
  '3': { icon: IconUser, color: 'text-info', label: '关注' },
  '4': { icon: IconBell, color: 'text-warning', label: '系统' },
  '5': { icon: IconMegaphone, color: 'text-chart-2', label: '活动' },
  '6': { icon: IconStar, color: 'text-primary', label: '订阅' },
  '7': { icon: IconGift, color: 'text-chart-2', label: '打赏' },
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig['4'];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
  };

  const linkTo = notification.targetType === 'post' && notification.targetId
    ? `/posts/${notification.targetId}`
    : notification.targetType === 'user' && notification.targetId
    ? `/users/${notification.targetId}`
    : '#';

  return (
    <Link
      to={linkTo}
      onClick={handleClick}
      data-name={`notification${notification.id}`}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl transition-colors group',
        !notification.isRead ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted/30'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', !notification.isRead ? 'bg-primary/10' : 'bg-muted/50')} data-name={`notification${notification.id}Icon`}>
        <Icon size={14} className={cn(!notification.isRead ? config.color : 'text-foreground-tertiary')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2" data-name={`notification${notification.id}Header`}>
          {notification.sourceUser && (
            <Avatar size="xs" src={notification.sourceUser.avatar} fallback={notification.sourceUser.username} />
          )}
          <span className="text-xs font-medium text-foreground" data-name={`notification${notification.id}Source`}>
            {notification.sourceUser?.username || '系统'}
          </span>
          <span className="tagPill text-[9px] bg-muted/50 text-foreground-tertiary" data-name={`notification${notification.id}Type`}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-foreground-secondary mt-1 line-clamp-2" data-name={`notification${notification.id}Content`}>
          {notification.content}
        </p>
        <span className="text-[10px] text-foreground-tertiary mt-1 block" data-name={`notification${notification.id}Time`}>
          {formatTime(notification.createdAt)}
        </span>
      </div>
      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" data-name={`notification${notification.id}Dot`} />
      )}
    </Link>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
