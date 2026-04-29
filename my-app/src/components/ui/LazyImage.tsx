import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * LazyImage - 图片懒加载组件
 *
 * 使用 IntersectionObserver 延迟加载图片，加载中显示 skeleton 占位，
 * 加载失败显示 fallback。同时设置 loading="lazy" 作为浏览器原生 backup。
 */
export function LazyImage({
  src,
  alt,
  className,
  skeletonClassName,
  fallbackSrc,
  rootMargin = '200px 0px',
  threshold = 0.01,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const currentSrc = hasError && fallbackSrc ? fallbackSrc : src;

  return (
    <div ref={containerRef} data-name="lazyImage" className={cn('relative overflow-hidden', className)}>
      {/* Skeleton placeholder */}
      {isLoading && isInView && (
        <div
          data-name="lazyImageSkeleton"
          className={cn(
            'absolute inset-0 animate-pulse rounded-md bg-white/5',
            skeletonClassName,
          )}
        />
      )}

      {/* Pre-viewport placeholder */}
      {!isInView && (
        <div
          className={cn(
            'absolute inset-0 rounded-md bg-white/5',
            skeletonClassName,
          )}
        />
      )}

      {/* Error fallback (no fallbackSrc provided) */}
      {hasError && !fallbackSrc && (
        <div data-name="lazyImageFallback" className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-md">
          <svg
            className="h-8 w-8 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
            />
          </svg>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className,
          )}
        />
      )}
    </div>
  );
}
