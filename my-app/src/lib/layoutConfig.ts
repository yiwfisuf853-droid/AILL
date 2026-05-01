export type LayoutType = 'default' | 'wide' | 'full' | 'sidebar-only' | 'no-sidebar';

export interface LayoutConfig {
  type: LayoutType;
  centerMaxWidth?: string;
  showRightSidebar?: boolean;
  showLeftSidebar?: boolean;
}

export const PAGE_LAYOUTS: Record<string, LayoutConfig> = {
  '/': { type: 'default', centerMaxWidth: '1060px', showRightSidebar: true, showLeftSidebar: true },
  '/posts': { type: 'default', centerMaxWidth: '800px', showRightSidebar: true, showLeftSidebar: true },
  '/posts/:id': { type: 'wide', centerMaxWidth: '860px', showRightSidebar: false, showLeftSidebar: true },
  '/posts/create': { type: 'wide', centerMaxWidth: '760px', showRightSidebar: false, showLeftSidebar: true },
  '/posts/:id/edit': { type: 'wide', centerMaxWidth: '760px', showRightSidebar: false, showLeftSidebar: true },

  '/rankings': { type: 'wide', centerMaxWidth: '860px', showRightSidebar: false, showLeftSidebar: true },
  '/shop': { type: 'full', centerMaxWidth: '1200px', showRightSidebar: false, showLeftSidebar: true },
  '/sections': { type: 'wide', centerMaxWidth: '1060px', showRightSidebar: false, showLeftSidebar: true },
  '/campaigns': { type: 'wide', centerMaxWidth: '860px', showRightSidebar: false, showLeftSidebar: true },
  '/collections': { type: 'wide', centerMaxWidth: '1060px', showRightSidebar: false, showLeftSidebar: true },
  '/collections/:id': { type: 'wide', centerMaxWidth: '860px', showRightSidebar: false, showLeftSidebar: true },
  '/ai': { type: 'full', centerMaxWidth: '1200px', showRightSidebar: false, showLeftSidebar: true },

  '/live': { type: 'full', centerMaxWidth: '1200px', showRightSidebar: false, showLeftSidebar: true },
  '/live/:id': { type: 'full', centerMaxWidth: '1200px', showRightSidebar: false, showLeftSidebar: true },

  '/users/:id': { type: 'wide', centerMaxWidth: '960px', showRightSidebar: false, showLeftSidebar: true },
  '/settings': { type: 'wide', centerMaxWidth: '760px', showRightSidebar: false, showLeftSidebar: true },
  '/notifications': { type: 'wide', centerMaxWidth: '760px', showRightSidebar: false, showLeftSidebar: true },
  '/favorites': { type: 'wide', centerMaxWidth: '800px', showRightSidebar: false, showLeftSidebar: true },
  '/messages': { type: 'full', centerMaxWidth: '100%', showRightSidebar: false, showLeftSidebar: true },
  '/feedback': { type: 'wide', centerMaxWidth: '760px', showRightSidebar: false, showLeftSidebar: true },
  '/search': { type: 'wide', centerMaxWidth: '860px', showRightSidebar: false, showLeftSidebar: true },
  '/subscriptions': { type: 'wide', centerMaxWidth: '800px', showRightSidebar: false, showLeftSidebar: true },
};

export function getLayoutConfig(pathname: string): LayoutConfig {
  const exactMatch = PAGE_LAYOUTS[pathname];
  if (exactMatch) return exactMatch;
  
  for (const [pattern, config] of Object.entries(PAGE_LAYOUTS)) {
    if (pattern.includes(':') && pathname.startsWith(pattern.split(':')[0])) {
      return config;
    }
  }
  
  return { type: 'default', centerMaxWidth: '680px', showRightSidebar: true, showLeftSidebar: true };
}