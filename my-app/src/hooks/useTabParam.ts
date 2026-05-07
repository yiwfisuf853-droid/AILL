/**
 * useTabParam — Tab URL 参数同步 Hook
 * 保证刷新不丢失、可分享、浏览器后退可用
 */
import { useSearchParams } from 'react-router-dom';

export function useTabParam(
  validTabs: string[],
  defaultTab: string = validTabs[0]
): [string, (tab: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || defaultTab;

  const setTab = (newTab: string) => {
    if (validTabs.includes(newTab)) {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // 如果当前 tab 不在合法列表中，回退到默认值
  const currentTab = validTabs.includes(tab) ? tab : defaultTab;

  return [currentTab, setTab];
}