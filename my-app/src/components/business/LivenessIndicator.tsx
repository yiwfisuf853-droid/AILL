import { cn } from '@/lib/utils';

interface LivenessIndicatorProps {
  active: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function LivenessIndicator({ active, size = 'sm', className }: LivenessIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={cn('inline-block rounded-full', dotSize, className)}
      data-name="livenessIndicator"
      style={active ? {
        background: 'hsl(var(--primary))',
        animation: 'pulseDot 2s ease-in-out infinite',
      } : {
        background: 'hsl(var(--muted-foreground))',
      }}
    />
  );
}
