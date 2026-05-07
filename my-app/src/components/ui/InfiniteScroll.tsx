/**
 * InfiniteScroll — 无限滚动加载组件（2.0 L1 新增）
 */
import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface InfiniteScrollProps {
  /** 是否正在加载 */
  loading: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 加载更多回调 */
  onLoadMore: () => void;
  /** 滚动容器类名 */
  className?: string;
  /** 触发距离阈值（px），距离底部多少时触发 */
  threshold?: number;
  /** 加载中提示 */
  loadingText?: string;
  /** 无更多数据提示 */
  endText?: string;
  children: React.ReactNode;
}

export function InfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  className,
  threshold = 200,
  loadingText = '加载中...',
  endText = '没有更多了',
  children,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: `${threshold}px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect, threshold]);

  return (
    <div data-name="infiniteScroll" className={cn('relative', className)}>
      {children}

      {/* 触发元素 */}
      <div ref={sentinelRef} className="h-1" data-name="infiniteScrollSentinel" />

      {/* 底部状态 */}
      {loading && (
        <div data-name="infiniteScrollLoading" className="flex items-center justify-center py-4 text-sm text-foreground-tertiary">
          <div className="h-4 w-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </div>
      )}

      {!hasMore && !loading && (
        <div data-name="infiniteScrollEnd" className="flex items-center justify-center py-4 text-sm text-foreground-tertiary">
          <span className="sectionDivider flex-1" />
          <span className="px-4">{endText}</span>
          <span className="sectionDivider flex-1" />
        </div>
      )}
    </div>
  );
}
