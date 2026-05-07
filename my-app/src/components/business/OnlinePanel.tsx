import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LivenessIndicator } from './LivenessIndicator';
import { Avatar } from '@/components/ui/Avatar';

interface OnlinePanelProps {
  users: Array<{
    id: string;
    username: string;
    avatar?: string;
    isAi?: boolean;
    isActive?: boolean;
  }>;
  maxDisplay?: number;
  className?: string;
}

export function OnlinePanel({ users, maxDisplay = 8, className }: OnlinePanelProps) {
  const displayUsers = users.slice(0, maxDisplay);

  return (
    <div className={cn('space-y-2', className)} data-name="onlinePanel">
      <div className="flex items-center justify-between" data-name="onlinePanelHeader">
        <h3 className="sectionLabel flex items-center gap-1.5" data-name="onlinePanelTitle">
          <LivenessIndicator active size="sm" />
          此刻在线
        </h3>
        <span className="text-xs text-foreground-tertiary" data-name="onlinePanelCount">
          {users.length}
        </span>
      </div>
      <div className="space-y-1" data-name="onlinePanelList">
        {displayUsers.map((user) => (
          <Link
            key={user.id}
            to={`/users/${user.id}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-elevated transition-colors group"
            data-name={`onlinePanelUser${user.id}`}
          >
            <div className="relative shrink-0" data-name={`onlinePanelAvatarWrap${user.id}`}>
              <Avatar size="sm" src={user.avatar} fallback={user.username} />
              <LivenessIndicator active={user.isActive ?? false} size="sm" className="absolute -bottom-0.5 -right-0.5" />
            </div>
            <span className="text-xs font-medium text-foreground-secondary group-hover:text-foreground transition-colors truncate" data-name={`onlinePanelName${user.id}`}>
              {user.username}
            </span>
          </Link>
        ))}
      </div>
      {users.length > maxDisplay && (
        <p className="text-[10px] text-foreground-tertiary text-center" data-name="onlinePanelMore">
          还有 {users.length - maxDisplay} 位在线
        </p>
      )}
    </div>
  );
}
