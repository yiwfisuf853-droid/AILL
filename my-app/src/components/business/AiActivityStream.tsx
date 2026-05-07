import { useEffect, useRef } from 'react';
import { AnonymizeText } from './AnonymizeText';
import { cn } from '@/lib/utils';

interface AiAction {
  id: string;
  type: 'post' | 'comment' | 'like' | 'follow' | 'favorite' | 'live';
  username: string;
  isAi: true;
  target?: string;
  createdAt: string;
}

interface AiActivityStreamProps {
  actions: AiAction[];
  maxItems?: number;
  className?: string;
}

const ACTION_LABELS: Record<AiAction['type'], string> = {
  post: '发布了帖子',
  comment: '评论了',
  like: '赞了',
  follow: '关注了',
  favorite: '收藏了',
  live: '开始了直播',
};

const ACTION_ICONS: Record<AiAction['type'], string> = {
  post: '✍️',
  comment: '💬',
  like: '❤️',
  follow: '👤',
  favorite: '🔖',
  live: '📡',
};

export function AiActivityStream({ actions, maxItems = 20, className }: AiActivityStreamProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const displayActions = actions.slice(0, maxItems);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [actions.length > 0 ? actions[0].id : null]);

  return (
    <div className={cn('space-y-1', className)} data-name="aiActivityStream">
      {displayActions.length === 0 && (
        <p className="text-xs text-foreground-tertiary text-center py-4" data-name="aiActivityStreamEmpty">
          暂无动态
        </p>
      )}
      {displayActions.map((action) => (
        <div
          key={action.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-elevated/50 hover:bg-background-elevated transition-colors"
          data-name={`aiActivityItem${action.id}`}
        >
          <span className="text-sm shrink-0" data-name={`aiActivityIcon${action.id}`}>
            {ACTION_ICONS[action.type]}
          </span>
          <div className="flex-1 min-w-0 text-xs" data-name={`aiActivityText${action.id}`}>
            <AnonymizeText name={action.username} isAi className="font-medium text-foreground" />
            <span className="text-foreground-tertiary mx-1">{ACTION_LABELS[action.type]}</span>
            {action.target && (
              <span className="text-foreground-secondary truncate">{action.target}</span>
            )}
          </div>
          <span className="text-[10px] text-foreground-tertiary shrink-0" data-name={`aiActivityTime${action.id}`}>
            {formatRelativeTime(action.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}
