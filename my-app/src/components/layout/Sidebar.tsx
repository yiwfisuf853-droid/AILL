import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { useNotificationStore } from "@/features/notifications/store";
import { useMessageStore } from "@/features/messages/store";
import { useTheme } from "@/lib/useTheme";
import { useSidebar } from "./SidebarContext";
import { NAV_LINKS, MODULE_HSL, SECTIONS } from "@/lib/nav-config";
import {
  IconPlus, IconNotification, IconMail, IconHeart, IconUser,
  IconSettings, IconSun, IconMoon, IconLogout,
  IconChevronLeft, IconChevronRight, IconClose,
} from "@/components/ui/icon";

export function Sidebar() {
  const { collapsed, mobileOpen, toggle, setMobileOpen } = useSidebar();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useMessageStore((s) => s.unreadTotal);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getActiveModule = () => {
    const match = NAV_LINKS.find((l) => isActive(l.href));
    return match?.module || "home";
  };

  const activeModule = getActiveModule();
  const activeHsl = MODULE_HSL[activeModule];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const content = (
    <div data-name="sidebar" className="flex flex-col h-full">
      {/* Logo */}
      <div data-name="sidebar.logo" className="flex items-center gap-2.5 px-3 h-14 shrink-0">
        <div
          data-name="sidebar.logoIcon"
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors duration-300"
          style={{ background: `hsl(${activeHsl} / 0.15)` }}
        >
          <span data-name="sidebar.logoLetter" className="text-sm font-black transition-colors duration-300" style={{ color: `hsl(${activeHsl})` }}>
            A
          </span>
        </div>
        {!collapsed && (
          <span data-name="sidebar.brand" className="text-base font-black tracking-tight whitespace-nowrap">
            <span className="text-foreground">AI</span>
            <span className="transition-colors duration-300" style={{ color: `hsl(${activeHsl})` }}>LL</span>
          </span>
        )}
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} data-name="sidebar.mobileCloseBtn" className="ml-auto text-foreground-tertiary hover:text-foreground">
            <IconClose size={18} />
          </button>
        )}
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">

        {/* 主导航 */}
        <nav data-name="sidebar.mainNav" className="space-y-0.5">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            const hsl = MODULE_HSL[link.module];
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => mobileOpen && setMobileOpen(false)}
                data-name={`sidebar.nav.${link.module}${active ? '.active' : ''}`}
                className="sidebar-nav-item relative"
                style={active ? { background: `hsl(${hsl} / 0.12)`, color: `hsl(${hsl})` } : undefined}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = `hsl(${hsl})`;
                    e.currentTarget.style.background = `hsl(${hsl} / 0.06)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "";
                    e.currentTarget.style.background = "";
                  }
                }}
                title={collapsed ? link.label : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r"
                    style={{ background: `hsl(${hsl})` }}
                  />
                )}
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 发帖按钮 */}
        {isAuthenticated && (
          <div data-name="sidebar.createPost" className={collapsed ? "px-0.5" : "px-1"}>
            <Link
              to="/posts/create"
              onClick={() => mobileOpen && setMobileOpen(false)}
              data-name="sidebar.createPostBtn"
              className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg"
              style={{
                background: `hsl(${activeHsl})`,
                boxShadow: `0 2px 12px hsl(${activeHsl} / 0.35)`,
              }}
              title={collapsed ? "发帖" : undefined}
            >
              <IconPlus size={16} />
              {!collapsed && "发帖"}
            </Link>
          </div>
        )}

        {/* 分类 */}
        {!collapsed && (
          <div data-name="sidebar.sections" className="pt-2 border-t border-border/40">
            <div data-name="sidebar.sectionsTitle" className="text-[10px] font-bold uppercase tracking-widest text-foreground-tertiary/70 mb-1.5 px-2">
              分区
            </div>
            <div className="space-y-0.5">
              {SECTIONS.map((section) => (
                <Link
                  key={section.id}
                  to={`/posts?sectionId=${section.id}`}
                  onClick={() => mobileOpen && setMobileOpen(false)}
                  data-name={`sidebar.section.${section.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span data-name={`sidebar.section.${section.id}.icon`} className="text-sm">{section.icon}</span>
                  <span data-name={`sidebar.section.${section.id}.name`} className="text-foreground-secondary">{section.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 个人区 */}
        <div data-name="sidebar.personal" className="pt-2 border-t border-border/40 space-y-0.5">
          {!collapsed && isAuthenticated && (
            <div data-name="sidebar.personalTitle" className="text-[10px] font-bold uppercase tracking-widest text-foreground-tertiary/70 mb-1.5 px-2">
              个人
            </div>
          )}

          {isAuthenticated ? (
            <>
              <Link to="/notifications" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.notifications" className="sidebar-nav-item" title={collapsed ? "通知" : undefined}>
                <div className="relative">
                  <IconNotification size={18} />
                  {unreadCount > 0 && (
                    <span data-name="sidebar.notifications.badge" className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span>通知</span>}
              </Link>
              <Link to="/messages" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.messages" className="sidebar-nav-item" title={collapsed ? "私信" : undefined}>
                <div className="relative">
                  <IconMail size={18} />
                  {unreadMessages > 0 && (
                    <span data-name="sidebar.messages.badge" className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </div>
                {!collapsed && <span>私信</span>}
              </Link>
              <Link to="/favorites" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.favorites" className="sidebar-nav-item" title={collapsed ? "收藏" : undefined}>
                <IconHeart size={18} />
                {!collapsed && <span>收藏</span>}
              </Link>
              {user && (
                <Link to={`/users/${user.id}`} onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.profile" className="sidebar-nav-item" title={collapsed ? "我的" : undefined}>
                  <IconUser size={18} />
                  {!collapsed && <span>我的</span>}
                </Link>
              )}
              <Link to="/settings" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.settings" className="sidebar-nav-item" title={collapsed ? "设置" : undefined}>
                <IconSettings size={18} />
                {!collapsed && <span>设置</span>}
              </Link>
            </>
          ) : (
            !collapsed && (
              <div data-name="sidebar.auth" className="px-1 space-y-1.5">
                <Link to="/auth/login" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebar.loginBtn" className="sidebar-nav-item w-full justify-center border border-border">
                  登录
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => mobileOpen && setMobileOpen(false)}
                  data-name="sidebar.registerBtn"
                  className="flex items-center justify-center rounded-lg py-2 text-sm font-medium text-white transition-all"
                  style={{ background: `hsl(${activeHsl})` }}
                >
                  注册
                </Link>
              </div>
            )
          )}

          {/* 主题切换 + 退出 */}
          <button onClick={toggleTheme} data-name="sidebar.themeToggle" className="sidebar-nav-item w-full" title={collapsed ? (theme === "dark" ? "亮色" : "暗色") : undefined}>
            {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            {!collapsed && <span>{theme === "dark" ? "亮色模式" : "暗色模式"}</span>}
          </button>
          {isAuthenticated && (
            <button onClick={handleLogout} data-name="sidebar.logoutBtn" className="sidebar-nav-item w-full text-destructive hover:text-destructive" title={collapsed ? "退出" : undefined}>
              <IconLogout size={18} />
              {!collapsed && <span>退出</span>}
            </button>
          )}
        </div>
      </div>

      {/* 折叠按钮 */}
      <div data-name="sidebar.collapseWrap" className="hidden lg:flex items-center justify-center border-t border-border/40 py-2">
        <button onClick={toggle} data-name="sidebar.collapseBtn" className="flex items-center justify-center h-7 w-7 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-muted transition-colors">
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside data-name="sidebarDesktop" className={`layout-left ${collapsed ? "collapsed" : ""}`}>
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div data-name="sidebar.mobileOverlay" className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div data-name="sidebar.mobileBackdrop" className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile drawer */}
      <aside
        data-name="sidebarMobile"
        className="fixed left-0 top-0 z-50 h-full w-[220px] bg-card border-r border-border/60 transition-transform duration-300 ease-out lg:hidden"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        {content}
      </aside>
    </>
  );
}
