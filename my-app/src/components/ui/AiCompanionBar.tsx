import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import type { AiLivenessStatus, AiPhase, CycleSummary } from '@/features/ai/store';
import type { AiActivity } from '@/features/ai/store';

const PHASE_LABELS: Record<Exclude<AiPhase, null>, string> = {
  thinking: '思考中',
  acting: '行动中',
  idle: '休息中',
};

const ACTION_LABELS: Record<string, string> = {
  post: '发帖',
  comment: '评论',
  like: '点赞',
  favorite: '收藏',
  follow: '关注',
  reward: '打赏',
  report: '举报',
  search: '搜索',
  browse: '浏览',
  settings: '改设置',
  rename: '改名',
};

const ACTION_EMOJI: Record<string, string> = {
  post: '📝', comment: '💬', like: '👍', favorite: '⭐',
  follow: '👤', reward: '💰', report: '🚨', search: '🔍',
  browse: '👀', settings: '⚙️', rename: '✨',
};

interface AiCompanionBarProps {
  livenessStatus: AiLivenessStatus | null;
  activity: AiActivity | null;
  onDismiss: () => void;
  onSleep: () => void;
  onOpenMemory: () => void;
}

export function AiCompanionBar({ livenessStatus, activity, onDismiss, onSleep, onOpenMemory }: AiCompanionBarProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  const aiName = livenessStatus?.aiName ?? activity?.aiName ?? 'AI';
  const phase = livenessStatus?.phase ?? null;
  const currentAction = livenessStatus?.action;
  const reason = livenessStatus?.reason;
  const cycleSummary: CycleSummary | undefined = livenessStatus?.cycleSummary;

  const pulseColor = phase === 'thinking'
    ? 'bg-primary'
    : phase === 'acting'
      ? 'bg-primary-hover'
      : 'bg-success';

  const phaseLabel = phase && phase in PHASE_LABELS
    ? PHASE_LABELS[phase]
    : '运行中';

  const actionLabel = currentAction && currentAction in ACTION_LABELS
    ? ACTION_LABELS[currentAction]
    : currentAction;

  // 自动导航
  const handleNavigate = () => {
    const action = activity?.actions?.[0];
    if (!action?.result) return;

    const { type, success, result } = action;
    if (type === 'browse' && result.targetId) navigate(`/posts/${result.targetId}`);
    else if (type === 'search' && result.keyword) navigate(`/search?q=${encodeURIComponent(String(result.keyword))}`);
    else if (type === 'post' && success && result.targetId) navigate(`/posts/${result.targetId}`);
    else if (type === 'comment' && success && (result.postId || result.targetId)) navigate(`/posts/${result.postId || result.targetId}`);
    else if (type === 'like' && success && result.targetType === 'post' && result.targetId) navigate(`/posts/${result.targetId}`);
    else if (type === 'favorite' && success && result.targetId) navigate(`/posts/${result.targetId}`);
    else if (type === 'follow' && success && result.targetId) navigate(`/users/${result.targetId}`);
    else if (type === 'reward' && success && result.targetId) navigate(`/posts/${result.targetId}`);
  };

  return (
    <div
      data-name="aiCompanionBar"
      className="fixed bottom-4 right-4 z-40 w-72 animate-in slide-in-from-bottom-2 duration-300"
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
        {/* 头部：脉冲点 + 名字 + 折叠按钮 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors"
          data-name="companionHeader"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pulseColor}`} />
          </span>
          <span className="text-foreground text-sm font-medium truncate flex-1 text-left">
            {aiName}
          </span>
          <span className="text-muted-foreground text-xs shrink-0">
            {phaseLabel}
          </span>
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronUp size={14} className="text-muted-foreground shrink-0" />}
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-2">
            {/* 决策理由 */}
            {reason && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground" data-name="companionReason">
                <span>💭</span>
                <span className="line-clamp-2">{reason}</span>
              </div>
            )}

            {/* 当前行为 */}
            {phase === 'acting' && currentAction && (
              <button
                onClick={handleNavigate}
                className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors w-full text-left"
                data-name="companionAction"
              >
                <span>{ACTION_EMOJI[currentAction] ?? '🔄'}</span>
                <span>正在{actionLabel ?? currentAction}</span>
              </button>
            )}

            {/* 轮次摘要 */}
            {cycleSummary && phase === 'idle' && (
              <div className="text-xs text-muted-foreground space-y-0.5" data-name="companionSummary">
                <div>▸ 本轮: {formatCycleSummary(cycleSummary)}</div>
                {cycleSummary.nextHint && (
                  <div className="truncate">▸ 下轮: {cycleSummary.nextHint}</div>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50" data-name="companionActions">
              <button
                onClick={onSleep}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/30"
                title="休眠"
                data-name="companionSleepBtn"
              >
                <Moon size={12} /> 休眠
              </button>
              <button
                onClick={onOpenMemory}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/30"
                title="记忆面板"
                data-name="companionMemoryBtn"
              >
                <Brain size={12} /> 记忆
              </button>
              <button
                onClick={onDismiss}
                className="ml-auto text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                data-name="companionDismissBtn"
              >
                隐藏
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCycleSummary(summary: CycleSummary): string {
  const parts: string[] = [];
  if (summary.totalActions > 0) {
    parts.push(`${summary.successCount}/${summary.totalActions} 成功`);
  }
  if (summary.durationMs > 0) {
    parts.push(`${(summary.durationMs / 1000).toFixed(1)}s`);
  }
  return parts.length > 0 ? parts.join(' · ') : '无行为';
}
