import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { AiLivenessStatus, AiPhase, AiActivityPayload } from '@/features/ai/store';
import { getAiActivityNavigationTarget, normalizeAiActivityActions } from '@/features/ai/activityNavigation';

const PHASE_LABELS: Record<Exclude<AiPhase, null>, string> = {
  thinking: '正在思考',
  acting: '正在行动',
  idle: '休息中',
};

const ACTION_LABELS: Record<string, string> = {
  post: '正在发帖',
  comment: '正在评论',
  like: '正在点赞',
  favorite: '正在收藏',
  follow: '正在关注',
  reward: '正在打赏',
  report: '正在举报',
  search: '正在搜索',
  browse: '正在浏览帖子',
  settings: '正在修改设置',
  rename: '正在改名',
};

function getPhaseLabel(phase: AiPhase, action?: string): string {
  if (phase === 'acting' && action) {
    return ACTION_LABELS[action] ?? `正在${action}`;
  }
  if (phase && phase in PHASE_LABELS) {
    return PHASE_LABELS[phase];
  }
  return '闲逛社区';
}

function getActivityText(activity: AiActivityPayload | null, fallbackLabel: string): string {
  const action = normalizeAiActivityActions(activity).find(item => item.result?.humanLikeStep || item.result?.displayText || item.error);
  if (!action) return fallbackLabel;
  if (action.result?.humanLikeStep) return action.result.humanLikeStep;
  if (action.result?.displayText) return action.result.displayText;
  if (action.error) return action.error;
  return fallbackLabel;
}

function getActivityDetail(activity: AiActivityPayload | null): string {
  const action = normalizeAiActivityActions(activity).find(item => item.result?.displayText || item.result?.repairHint || item.error);
  if (!action) return '';
  if (action.success === false) return action.result?.repairHint || action.error || '这次行动没有成功，正在调整下一步';
  return action.result?.displayText || '';
}

interface AiActivityOverlayProps {
  livenessStatus: AiLivenessStatus | null;
  activity: AiActivityPayload | null;
  onDismiss: () => void;
}

export function AiActivityOverlay({ livenessStatus, activity, onDismiss }: AiActivityOverlayProps) {
  const navigate = useNavigate();
  const navigatedRef = useRef(false);

  const aiName = livenessStatus?.aiName ?? activity?.aiName ?? 'AI';
  const phase = livenessStatus?.phase ?? null;
  const currentAction = livenessStatus?.action;

  useEffect(() => {
    if (navigatedRef.current) return;

    const target = getAiActivityNavigationTarget(activity);
    if (!target) return;

    navigatedRef.current = true;
    navigate(target);
  }, [activity, navigate]);

  useEffect(() => {
    navigatedRef.current = false;
  }, [livenessStatus?.cycleId]);

  const label = getActivityText(activity, getPhaseLabel(phase, currentAction));
  const detail = getActivityDetail(activity);

  const pulseColor = phase === 'thinking'
    ? 'bg-primary'
    : phase === 'acting'
      ? 'bg-primary-hover'
      : 'bg-success';
  const pulseOpacity = phase === 'thinking'
    ? 'from-primary via-primary/80 to-primary-hover'
    : phase === 'acting'
      ? 'from-primary via-primary-hover to-primary/80'
      : 'from-success via-success/80 to-success/60';

  return (
    <div
      data-name="aiActivityOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 min-w-[280px] max-w-[380px] animate-in fade-in zoom-in-95 duration-200 relative">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          title="关闭遮罩"
          data-name="overlayCloseBtn"
        >
          <X size={14} />
        </button>
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${pulseOpacity} flex items-center justify-center shadow-lg`}>
          <span className="text-white text-lg font-bold select-none">
            {aiName?.charAt(0)?.toUpperCase() ?? 'A'}
          </span>
        </div>
        <p className="text-foreground text-sm font-medium">
          {aiName} 正在行动
        </p>
        <p className="text-muted-foreground text-xs text-center leading-relaxed max-w-[320px]">
          {label}
        </p>
        {detail && detail !== label && (
          <p className="text-muted-foreground/80 text-[11px] text-center leading-relaxed max-w-[320px]">
            {detail}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pulseColor}`} />
          </span>
          <span className="text-muted-foreground text-[10px]">
            {phase === 'thinking' ? '思考中' : phase === 'acting' ? '执行中' : phase === 'idle' ? '等待中' : '运行中'}
          </span>
        </div>
        <p className="text-muted-foreground/60 text-[10px] mt-1">
          请不要操作
        </p>
      </div>
    </div>
  );
}