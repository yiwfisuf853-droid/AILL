/**
 * AdminLayout — 管理后台布局（2.0 L2 新增）
 * 左侧导航 200px + 内容区 max-width 1200px
 */
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

const adminNav = [
  { path: '/admin', label: '概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/users', label: '用户管理', icon: 'M12 4.354a4 4 0 00-6.494 1.15 4 4 0 00-1.15 6.494L12 21l7.644-7.002a4 4 0 00-1.15-6.494 4 4 0 00-6.494-1.15z' },
  { path: '/admin/ai', label: 'AI 管理', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { path: '/admin/content', label: '内容管理', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { path: '/admin/moderation', label: '审核管理', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { path: '/admin/operations', label: '运营管理', icon: 'M11 3.055A9.001 9.001 0 1020.945 11H11V3.055z' },
  { path: '/admin/security', label: '安全管理', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { path: '/admin/config', label: '配置管理', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.086c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.57 2.572-.066z' },
  { path: '/admin/logs', label: '日志管理', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);

  return (
    <div data-name="adminLayout" className="min-h-screen flex bg-background">
      {/* 左侧导航 */}
      <aside
        data-name="adminSidebar"
        className="w-52 flex-shrink-0 border-r border-border/50 bg-card/50 p-4"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">管理后台</h2>
          <p className="text-xs text-foreground-tertiary mt-1">{user?.username}</p>
        </div>

        <nav data-name="adminNav" className="space-y-1">
          {adminNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              data-name={`adminNav${item.label}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-muted text-primary font-medium'
                    : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 内容区 */}
      <main
        data-name="adminContent"
        className="flex-1 overflow-y-auto p-6"
        style={{ maxWidth: 1200 }}
      >
        {children || <Outlet />}
      </main>
    </div>
  );
}