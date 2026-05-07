import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { IconChevronLeft, IconChevronRight, IconHome, IconGroup, IconAI, IconFileText, IconShield, IconMegaphone, IconLock, IconSettings, IconBookOpen } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store';

export type AdminTab = 'overview' | 'users' | 'ai' | 'content' | 'moderation' | 'operations' | 'security' | 'config' | 'logs';

interface SidebarItem {
  key: AdminTab;
  path: string;
  label: string;
  icon: React.ElementType;
}

export const sidebarItems: SidebarItem[] = [
  { key: 'overview', path: '/admin/overview', label: '概览', icon: IconHome },
  { key: 'users', path: '/admin/users', label: '用户', icon: IconGroup },
  { key: 'ai', path: '/admin/ai', label: 'AI', icon: IconAI },
  { key: 'content', path: '/admin/content', label: '内容', icon: IconFileText },
  { key: 'moderation', path: '/admin/moderation', label: '审核', icon: IconShield },
  { key: 'operations', path: '/admin/operations', label: '运营', icon: IconMegaphone },
  { key: 'security', path: '/admin/security', label: '安全', icon: IconLock },
  { key: 'config', path: '/admin/config', label: '配置', icon: IconSettings },
  { key: 'logs', path: '/admin/logs', label: '日志', icon: IconBookOpen },
];

export function getAdminTabFromPath(pathname: string): AdminTab {
  const match = sidebarItems.find(item => pathname.startsWith(item.path));
  return match?.key || 'overview';
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const location = useLocation();
  const activeTab = getAdminTabFromPath(location.pathname);

  return (
    <aside
      data-name="adminSidebar"
      className={cn(
        'fixed left-0 top-0 h-full z-30 flex flex-col border-r border-white/5 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
      style={{ background: 'linear-gradient(180deg, hsl(var(--admin-bg)) 0%, hsl(var(--admin-bg-deep)) 100%)' }}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0" data-name="adminSidebarLogo">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm shrink-0">A</div>
        {!collapsed && <span className="text-white font-bold text-sm tracking-wide whitespace-nowrap">AILL Admin</span>}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto" data-name="adminSidebarNav">
        {sidebarItems.map(({ key, path, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <Link
              key={key}
              to={path}
              data-name={`adminNav${key}`}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/20 text-primary-light shadow-inner'
                  : 'text-foreground-tertiary hover:text-foreground-secondary hover:bg-white/5'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary' : 'text-foreground-tertiary')} />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5" data-name="adminSidebarFooter">
        <Link
          to="/"
          data-name="adminBackToCommunity"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-foreground-tertiary hover:text-foreground-secondary hover:bg-white/5 transition-colors text-sm mb-1"
        >
          <IconChevronLeft size={16} />
          {!collapsed && <span>返回社区</span>}
        </Link>
        <button
          onClick={onToggleCollapse}
          data-name="adminSidebarCollapseBtn"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-foreground-tertiary hover:text-foreground-secondary hover:bg-white/5 transition-colors text-sm"
        >
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          {!collapsed && <span>收起</span>}
        </button>
      </div>
    </aside>
  );
}

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AdminModal({ open, onClose, title, children }: AdminModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-name="adminModalOverlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} data-name="adminModalBackdrop" />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ backgroundColor: 'hsl(var(--admin-modal-bg))' }} data-name="adminModalContent">
        <div className="flex items-center justify-between mb-5" data-name="adminModalHeader">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} data-name="adminModalCloseBtn" className="p-1 rounded-lg text-foreground-tertiary hover:text-white hover:bg-white/10 transition-colors">
            <IconChevronLeft size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminLayoutShell() {
  const { user, isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const activeTab = getAdminTabFromPath(location.pathname);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--admin-bg))' }}>
        <p className="text-foreground-tertiary text-sm">请先登录后再访问管理后台</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--admin-bg))' }}>
        <p className="text-foreground-tertiary text-sm">仅管理员可访问此页面</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: 'hsl(var(--admin-bg))' }} data-name="admin">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`} data-name="adminMainContent">
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-xl" style={{ backgroundColor: 'hsl(var(--admin-bg) / 0.8)' }} data-name="adminHeader">
          <h1 className="text-sm font-semibold text-white" data-name="adminHeaderTitle">
            {sidebarItems.find(i => i.key === activeTab)?.label || '管理后台'}
          </h1>
          <div className="flex items-center gap-3" data-name="adminHeaderUserArea">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white" data-name="adminUserAvatar">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-sm text-foreground-tertiary" data-name="adminUsername">{user?.username || 'Admin'}</span>
          </div>
        </header>

        <div className="p-8" data-name="adminTabContent"><Outlet /></div>
      </main>
    </div>
  );
}
