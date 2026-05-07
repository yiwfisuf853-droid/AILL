import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      data-name="skeleton"
      className={cn('animateShimmer rounded-md', className)}
    />
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div data-name="skeletonGrid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3 staggerChild" style={{ animationDelay: `${i * 60}ms` }}>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div data-name="skeletonList" className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card staggerChild" style={{ animationDelay: `${i * 60}ms` }}>
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div data-name="skeletonPage" className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div data-name="skeletonProfile" className="space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div data-name="skeletonTable" className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="border-b border-border/40 px-5 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border/20 px-5 py-3 flex gap-4 staggerChild" style={{ animationDelay: `${i * 40}ms` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div data-name="skeletonChat" className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn('flex gap-2 staggerChild', i % 2 === 0 ? 'justify-start' : 'justify-end')} style={{ animationDelay: `${i * 50}ms` }}>
          <div className={cn('rounded-xl px-3 py-2 space-y-1', i % 2 === 0 ? 'bg-muted/40' : 'bg-primary/10')}>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
