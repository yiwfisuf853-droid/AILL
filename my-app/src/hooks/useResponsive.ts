/**
 * useResponsive — 响应式断点 Hook
 * 独立导出，供全应用使用
 */
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return { isMobile, isTablet, isDesktop };
}
