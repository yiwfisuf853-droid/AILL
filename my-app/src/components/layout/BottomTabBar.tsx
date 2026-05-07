/**
 * BottomTabBar — 移动端底部导航栏（2.0 L2 新增）
 * 5 Tab: 首页、广场、发布、通知、我的
 */
import { NavLink } from 'react-router-dom';
import { useNotificationStore } from '@/features/messages/store';

const tabs = [
  { path: '/home', icon: 'home', label: '首页' },
  { path: '/square', icon: 'grid', label: '广场' },
  { path: '/compose', icon: 'plus', label: '发布', isAction: true },
  { path: '/messages?tab=notifications', icon: 'notification', label: '通知' },
  { path: '/me', icon: 'user', label: '我的' },
];

const iconMap: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  plus: 'M12 4v16m8-8H4',
  notification: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

export function BottomTabBar() {
  const unreadCount = useNotificationStore((s) => s.unreadNotificationCount);

  return (
    <nav
      data-name="bottomTabBar"
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 lg:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            data-name={`tabBar${tab.label}`}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                tab.isAction
                  ? ''
                  : isActive
                  ? 'text-primary'
                  : 'text-foreground-tertiary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {tab.isAction ? (
                  /* 发布按钮 - FAB 样式 */
                  <div
                    data-name="tabBarFab"
                    className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center -mt-6 shadow-lg"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={iconMap.plus} />
                    </svg>
                  </div>
                ) : (
                  <>
                    <svg
                      className={`w-6 h-6 mb-0.5 ${isActive ? 'text-primary' : 'text-foreground-tertiary'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={iconMap[tab.icon]} />
                    </svg>
                    <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-foreground-tertiary'}`}>
                      {tab.label}
                    </span>
                    {/* 通知未读红点 */}
                    {tab.icon === 'notification' && unreadCount > 0 && (
                      <span className="absolute top-1 right-1/4 min-w-2 h-2 rounded-full bg-destructive" />
                    )}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}