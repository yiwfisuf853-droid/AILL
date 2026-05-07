import type { ReactNode } from 'react';
import { IconSearch, IconComment, IconHeart, IconStar, IconUser, IconBookOpen, IconWarning, IconGift, IconBell } from '@/components/ui/Icon';

type EmptyType = 'search' | 'posts' | 'comments' | 'likes' | 'favorites' | 'users' | 'messages' | 'notifications' | 'generic' | 'error' | 'shop' | 'campaigns';

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const typeConfig: Record<EmptyType, { icon: any; title: string; description: string }> = {
  search: { icon: IconSearch, title: '未找到结果', description: '试试其他关键词或减少筛选条件' },
  posts: { icon: IconBookOpen, title: '暂无帖子', description: '成为第一个发帖的人吧' },
  comments: { icon: IconComment, title: '暂无评论', description: '来说点什么吧' },
  likes: { icon: IconHeart, title: '暂无点赞', description: '你的内容还没有收到点赞' },
  favorites: { icon: IconStar, title: '暂无收藏', description: '收藏你感兴趣的内容' },
  users: { icon: IconUser, title: '暂无用户', description: '还没有用户加入' },
  messages: { icon: IconComment, title: '暂无消息', description: '你的收件箱是空的' },
  notifications: { icon: IconBell, title: '暂无通知', description: '没有新的通知' },
  shop: { icon: IconGift, title: '暂无商品', description: '商店暂时没有可兑换的商品' },
  campaigns: { icon: IconGift, title: '暂无活动', description: '目前没有进行中的活动' },
  generic: { icon: IconSearch, title: '暂无内容', description: '这里还没有任何内容' },
  error: { icon: IconWarning, title: '加载失败', description: '请稍后重试' },
};

export function EmptyState({ type = 'generic', title, description, icon, action, className = '' }: EmptyStateProps) {
  const config = typeConfig[type] || typeConfig.generic;
  const Icon = config.icon;

  return (
    <div className={`text-center py-16 ${className}`} data-name={`emptyState${type}`}>
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4" data-name={`emptyState${type}Icon`}>
        {icon || <Icon size={28} className="text-foreground-tertiary/40" />}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5" data-name={`emptyState${type}Title`}>
        {title || config.title}
      </h3>
      <p className="text-sm text-foreground-tertiary max-w-xs mx-auto" data-name={`emptyState${type}Desc`}>
        {description || config.description}
      </p>
      {action && <div className="mt-4" data-name={`emptyState${type}Action`}>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = '出错了', description = '加载内容时发生错误，请稍后重试', onRetry, className = '' }: ErrorStateProps) {
  return (
    <div className={`text-center py-16 ${className}`} data-name="errorState">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4" data-name="errorStateIcon">
        <IconWarning size={28} className="text-destructive/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5" data-name="errorStateTitle">{title}</h3>
      <p className="text-sm text-foreground-tertiary max-w-xs mx-auto" data-name="errorStateDesc">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          data-name="errorStateRetryBtn"
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
}
