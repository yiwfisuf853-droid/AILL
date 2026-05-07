import { useEffect, useRef, useCallback, useState } from 'react';

export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    observerRef.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '200px',
      ...options,
    });
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [callback, options]);

  return ref;
}

export function useInfiniteScroll(fetchMore: () => Promise<void>, hasMore: boolean) {
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      if (!hasMore) return;

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setLoading(true);
            await fetchMore();
            setLoading(false);
          }
        },
        { threshold: 0.1 }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, fetchMore]
  );

  return { lastElementRef, loading };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function usePageVisibility() {
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return visible;
}

export function usePrefetch(fn: () => Promise<void>, delay = 2000) {
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    const timer = setTimeout(async () => {
      prefetched.current = true;
      try { await fn(); } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, [fn, delay]);
}
