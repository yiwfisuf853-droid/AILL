import React from 'react';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

interface UserCardProps {
  user: {
    id: string;
    username: string;
    avatar?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    postCount?: number;
    isAi?: boolean;
    isFollowing?: boolean;
  };
  onFollow?: (userId: string) => void;
  onClick?: (userId: string) => void;
  compact?: boolean;
}

function formatCount(count?: number): string {
  if (count === undefined) return '0';
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function UserCard({ user, onFollow, onClick, compact = false }: UserCardProps) {
  const handleClick = () => {
    onClick?.(user.id);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow?.(user.id);
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/30',
        compact ? 'px-3 py-2' : 'p-4'
      )}
      data-name="userCard"
      onClick={handleClick}
    >
      {/* 顶部：头像 + 用户名 + AI标识 + 关注按钮 */}
      <div className="flex items-center gap-3" data-name="userCardHeader">
        <Avatar
          src={user.avatar}
          fallback={user.username}
          size={compact ? 'sm' : 'md'}
          isAi={user.isAi}
          className={compact ? 'w-8 h-8' : 'w-10 h-10'}
          data-name="userCardAvatar"
        />

        <div className="flex-1 min-w-0" data-name="userCardInfo">
          <div className="flex items-center gap-1.5" data-name="userCardNameRow">
            <span
              className={cn('font-medium text-foreground truncate', compact ? 'text-sm' : 'text-sm')}
              data-name="userCardUsername"
            >
              {user.username}
            </span>
            {user.isAi && (
              <span
                className="inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0"
                data-name="userCardAiBadge"
              >
                AI
              </span>
            )}
          </div>
        </div>

        {onFollow && (
          <button
            type="button"
            onClick={handleFollowClick}
            className={cn(
              'shrink-0 inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors',
              user.isFollowing
                ? 'border border-border bg-transparent text-muted-foreground hover:bg-muted/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              compact ? 'px-2.5 py-0.5' : 'px-3 py-1'
            )}
            data-name="userCardFollowBtn"
          >
            {user.isFollowing ? '已关注' : '关注'}
          </button>
        )}
      </div>

      {/* 简介（非 compact 模式） */}
      {!compact && user.bio && (
        <p
          className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed"
          data-name="userCardBio"
        >
          {user.bio}
        </p>
      )}

      {/* 统计（非 compact 模式） */}
      {!compact && (
        <div
          className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground"
          data-name="userCardStats"
        >
          <span data-name="userCardPostCount">
            <span className="font-medium text-foreground">{formatCount(user.postCount)}</span> 帖子
          </span>
          <span data-name="userCardFollowerCount">
            <span className="font-medium text-foreground">{formatCount(user.followerCount)}</span> 粉丝
          </span>
          <span data-name="userCardFollowingCount">
            <span className="font-medium text-foreground">{formatCount(user.followingCount)}</span> 关注
          </span>
        </div>
      )}
    </div>
  );
}
