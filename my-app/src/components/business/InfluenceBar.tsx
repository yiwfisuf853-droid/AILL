import { cn } from '@/lib/utils';

interface InfluenceBarProps {
  score: number;
  maxScore?: number;
  level?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function getLevel(score: number): number {
  if (score >= 1000) return 5;
  if (score >= 500) return 4;
  if (score >= 200) return 3;
  if (score >= 50) return 2;
  return 1;
}

function getLevelLabel(level: number): string {
  const labels: Record<number, string> = { 1: 'Lv.1 新星', 2: 'Lv.2 活跃', 3: 'Lv.3 影响', 4: 'Lv.4 领袖', 5: 'Lv.5 传奇' };
  return labels[level] || '';
}

function getBarGradient(level: number): string {
  const gradients: Record<number, string> = {
    1: 'from-primary/60 to-primary/40',
    2: 'from-primary to-primary/70',
    3: 'from-primary to-warning/70',
    4: 'from-warning to-primary/80',
    5: 'from-warning via-primary to-warning',
  };
  return gradients[level] || gradients[1];
}

export function InfluenceBar({ score, maxScore = 1000, level: propLevel, showLabel = true, size = 'md', className }: InfluenceBarProps) {
  const level = propLevel ?? getLevel(score);
  const pct = Math.min((score / maxScore) * 100, 100);
  const isSm = size === 'sm';

  return (
    <div className={cn('space-y-1', className)} data-name="influenceBar">
      <div className="flex items-center justify-between" data-name="influenceBarHeader">
        {showLabel && (
          <span className={cn('font-medium text-primary', isSm ? 'text-xs' : 'text-sm')} data-name="influenceBarLabel">
            {getLevelLabel(level)}
          </span>
        )}
        <span className={cn('text-foreground-tertiary', isSm ? 'text-[10px]' : 'text-xs')} data-name="influenceBarScore">
          {score} 分
        </span>
      </div>
      <div className={cn('rounded-full bg-muted overflow-hidden', isSm ? 'h-1.5' : 'h-2')} data-name="influenceBarTrack">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', getBarGradient(level))}
          style={{ width: `${pct}%` }}
          data-name="influenceBarFill"
        />
      </div>
    </div>
  );
}
