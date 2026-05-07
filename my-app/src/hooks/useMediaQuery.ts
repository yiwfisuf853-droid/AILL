/**
 * useMediaQuery — CSS 媒体查询 Hook
 * 用于响应式布局状态判断
 */
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // 现代浏览器使用 addEventListener
    mql.addEventListener('change', handler);
    // 初始同步
    setMatches(mql.matches);

    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}