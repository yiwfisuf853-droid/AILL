import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconCheck, IconClock, IconUsers, IconLock, IconChevronDown, IconChevronUp, IconDelete } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { Poll, PollOption } from '../types';

/** 投票卡片属性 */
interface PollCardProps {
  /** 投票数据 */
  poll: Poll;
  /** 投票回调 */
  onVote?: (optionIds: string[]) => Promise<void>;
  /** 取消投票回调 */
  onCancelVote?: () => Promise<void>;
  /** 删除投票回调（仅创建者可见） */
  onDelete?: () => Promise<void>;
  /** 是否显示创建者操作按钮 */
  showCreatorActions?: boolean;
  /** 当前用户ID */
  currentUserId?: string;
  /** 加载中 */
  loading?: boolean;
}

/**
 * 投票选项组件（未投票状态）
 */
function PollOptionItem({
  option,
  isSelected,
  isMulti,
  disabled,
  onClick,
}: {
  option: PollOption;
  isSelected: boolean;
  isMulti: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-name="pollOption"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left',
        'hover:border-primary hover:bg-primary/5',
        isSelected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border bg-background',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-background'
      )}
    >
      {/* Radio/Checkbox 指示器 */}
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
        )}
      >
        {isSelected && <IconCheck size={12} className="text-primary-foreground" />}
      </span>
      <span className="flex-1 font-medium text-foreground">{option.text}</span>
    </button>
  );
}

/**
 * 投票结果组件（已投票/已截止状态）
 */
function PollResultItem({
  option,
  percentage,
  isVoted,
  isVotedByUser,
}: {
  option: PollOption;
  percentage: number;
  isVoted: boolean;
  isVotedByUser: boolean;
}) {
  return (
    <div
      data-name="pollResult"
      className={cn('relative overflow-hidden rounded-lg', isVotedByUser && 'ring-1 ring-primary')}
    >
      {/* 进度条背景 */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg transition-all duration-500 ease-out',
          isVotedByUser ? 'bg-primary/20' : 'bg-muted'
        )}
        style={{ width: `${percentage}%` }}
      />
      {/* 内容 */}
      <div className="relative flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {isVotedByUser && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <IconCheck size={12} className="text-primary-foreground" />
            </span>
          )}
          <span className={cn('font-medium', isVotedByUser ? 'text-primary' : 'text-foreground')}>
            {option.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{percentage.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">({option.voteCount})</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 投票卡片组件
 * 支持三种状态：未投票、已投票、已截止
 */
export function PollCard({
  poll,
  onVote,
  onCancelVote,
  onDelete,
  showCreatorActions = false,
  currentUserId,
  loading = false,
}: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const isMulti = poll.pollType === 'multi';
  const isExpired = poll.isExpired;
  const hasVoted = poll.userVoted;
  const isCreator = currentUserId === poll.userId;

  // 计算百分比
  const percentages = useMemo(() => {
    const total = poll.totalVoters || 1;
    const result: Record<string, number> = {};
    poll.options.forEach((opt) => {
      result[opt.id] = (opt.voteCount / total) * 100;
    });
    return result;
  }, [poll.options, poll.totalVoters]);

  // 处理选项点击（未投票状态）
  const handleOptionClick = (optionId: string) => {
    if (isExpired || hasVoted || loading) return;

    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (isMulti) {
        // 多选：切换选择状态
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
      } else {
        // 单选：直接替换
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  };

  // 提交投票
  const handleVote = async () => {
    if (selectedOptions.size === 0 || loading) return;
    await onVote?.(Array.from(selectedOptions));
    setSelectedOptions(new Set());
  };

  // 格式化截止时间
  const formatEndTime = (endedAt: string | null) => {
    if (!endedAt) return '不限';
    const date = new Date(endedAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return '已截止';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}天后截止`;
    if (hours > 0) return `${hours}小时后截止`;
    return '即将截止';
  };

  return (
    <Card data-name="pollCard" className="bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle data-name="pollTitle" className="text-lg leading-tight">
              {poll.title}
            </CardTitle>
            {poll.description && (
              <CardDescription data-name="pollDescription" className="mt-1">
                {poll.description}
              </CardDescription>
            )}
          </div>
          {/* 已截止标签 */}
          {isExpired && (
            <span
              data-name="pollExpiredBadge"
              className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground"
            >
              已截止
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* 投票类型提示 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>{isMulti ? '多选' : '单选'}</span>
          {poll.isAnonymous && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <IconLock size={12} />
                匿名
              </span>
            </>
          )}
        </div>

        {/* 投票选项 */}
        {expanded &&
          (hasVoted || isExpired ? (
            // 已投票/已截止：显示结果
            <div data-name="pollResults" className="space-y-2">
              {poll.options.map((option) => (
                <PollResultItem
                  key={option.id}
                  option={option}
                  percentage={percentages[option.id] || 0}
                  isVoted={hasVoted}
                  isVotedByUser={option.votedByUser}
                />
              ))}
            </div>
          ) : (
            // 未投票：显示可点击选项
            <div data-name="pollOptions" className="space-y-2">
              {poll.options.map((option) => (
                <PollOptionItem
                  key={option.id}
                  option={option}
                  isSelected={selectedOptions.has(option.id)}
                  isMulti={isMulti}
                  disabled={loading}
                  onClick={() => handleOptionClick(option.id)}
                />
              ))}
            </div>
          ))}
      </CardContent>

      <CardFooter className="flex-col gap-3 pt-2">
        {/* 底部信息 */}
        <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <IconUsers size={14} />
              <span data-name="pollTotalVoters">{poll.totalVoters} 人投票</span>
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock size={14} />
              <span>{formatEndTime(poll.endedAt)}</span>
            </span>
          </div>
          {/* 折叠按钮 */}
          <button
            data-name="pollToggleExpand"
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="w-full flex items-center justify-between gap-2">
          {hasVoted || isExpired ? (
            // 已投票/已截止：显示取消投票按钮（仅未截止且已投票可取消）
            !isExpired && hasVoted && onCancelVote && (
              <Button
                data-name="pollCancelVote"
                variant="outline"
                size="sm"
                onClick={onCancelVote}
                disabled={loading}
              >
                取消投票
              </Button>
            )
          ) : (
            // 未投票：显示投票按钮
            onVote && (
              <Button
                data-name="pollSubmitVote"
                size="sm"
                onClick={handleVote}
                disabled={selectedOptions.size === 0 || loading}
                loading={loading}
              >
                投票
              </Button>
            )
          )}

          {/* 创建者操作 */}
          {showCreatorActions && isCreator && onDelete && (
            <Button
              data-name="pollDelete"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive ml-auto"
            >
              <IconDelete size={16} />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default PollCard;