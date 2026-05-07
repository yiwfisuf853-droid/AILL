import { useState, useEffect } from 'react';

/**
 * 监听滚动位置，返回收缩比例 (0=展开, 1=完全收缩)
 * @param threshold 开始收缩的滚动距离
 * @param range 从开始收缩到完全收缩的滚动距离
 */
export function useScrollCollapse(threshold = 80, range = 120) {
  const [collapseRatio, setCollapseRatio] = useState(0);

  useEffect(() => {
    const el = document.querySelector('.layout-center');
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      if (scrollTop <= threshold) {
        setCollapseRatio(0);
      } else if (scrollTop >= threshold + range) {
        setCollapseRatio(1);
      } else {
        setCollapseRatio((scrollTop - threshold) / range);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [threshold, range]);

  return collapseRatio;
}
