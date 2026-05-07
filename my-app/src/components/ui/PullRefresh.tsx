/**
 * PullRefresh — 下拉刷新组件（2.0 L1 新增）
 * 支持触摸端下拉刷新 + 桌面端点击刷新
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface PullRefreshProps {
  /** 是否正在刷新 */
  refreshing: boolean;
  /** 刷新回调 */
  onRefresh: () => void;
  /** 下拉阈值（px），超过此距离触发刷新 */
  threshold?: number;
  /** 容器类名 */
  className?: string;
  children: React.ReactNode;
}

export function PullRefresh({
  refreshing,
  onRefresh,
  threshold = 80,
  className,
  children,
}: PullRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return false;
    return el.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    if (!canPull()) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [refreshing, canPull]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // 阻尼效果：越拉越难拉
    const dampened = Math.min(delta * 0.5, threshold * 1.5);
    setPullDistance(dampened);
  }, [isPulling, refreshing, threshold]);

  const handleTouchEnd = useCallback(() => {
    setIsPulling(false);
    if (pullDistance >= threshold && !refreshing) {
      onRefresh();
    }
    setPullDistance(0);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  // 刷新完成后重置
  useEffect(() => {
    if (!refreshing) {
      setPullDistance(0);
    }
  }, [refreshing]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 0 || refreshing;

  return (
    <div
      ref={containerRef}
      data-name="pullRefresh"
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉指示器 */}
      <div
        data-name="pullRefreshIndicator"
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: showIndicator ? (refreshing ? 48 : pullDistance * 0.6) : 0,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className={cn(
            'flex items-center gap-2 text-sm text-foreground-tertiary',
            refreshing && 'animate-spin'
          )}
        >
          <svg
            className="w-5 h-5"
            style={{ transform: `rotate(${progress * 360}deg)` }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{refreshing ? '刷新中...' : progress >= 1 ? '释放刷新' : '下拉刷新'}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
