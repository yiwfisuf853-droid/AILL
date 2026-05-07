import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { useNotificationStore } from "@/features/messages/store";
import { useMessageStore } from "@/features/messages/store";
import { useSettingsStore } from "@/features/settings/store";
import { useSidebar } from "./SidebarContext";
import { NAV_LINKS, SECTIONS, DEFAULT_SIDEBAR_CONFIG, type SidebarConfig } from "@/lib/navConfig";
import {
  IconHeart, IconLogout,
  IconChevronLeft, IconChevronRight, IconClose,
} from "@/components/ui/Icon";
import { useState, useRef, useCallback, useMemo } from "react";

export function Sidebar() {
  const { collapsed, mobileOpen, toggle, setMobileOpen } = useSidebar();
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadNotificationCount = useNotificationStore((s) => s.unreadNotificationCount);
  const unreadMessages = useMessageStore((s) => s.unreadTotal);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // 侧边栏配置：优先从后端 settings store 读取，fallback 到默认值
  const backendSidebarCfg = useSettingsStore((s) => s.settings.sidebarConfig as SidebarConfig | undefined);
  const sidebarConfig: SidebarConfig = useMemo(() => {
    const raw = backendSidebarCfg;
    if (raw && typeof raw === 'object' && raw.sections && raw.personal) {
      return {
        sections: DEFAULT_SIDEBAR_CONFIG.sections.map((def) => {
          const found = raw.sections.find((s: { id: string }) => s.id === def.id);
          return found ?? def;
        }),
        personal: DEFAULT_SIDEBAR_CONFIG.personal.map((def) => {
          const found = raw.personal.find((p: { id: string }) => p.id === def.id);
          return found ?? def;
        }),
      };
    }
    return DEFAULT_SIDEBAR_CONFIG;
  }, [backendSidebarCfg]);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoverExpanded(true), 150);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoverExpanded(false), 200);
  }, []);

  const visibleSections = SECTIONS.filter(s => sidebarConfig.sections.find(c => c.id === s.id)?.visible !== false);
  const visiblePersonal = sidebarConfig.personal.filter(p => p.visible);

  const handleLogout = async () => {
    await logout();
    navigate("/home");
  };

  const content = (
    <div data-name="sidebar" className="flex flex-col h-full">
      {/* Logo - fixed at top */}
      <div data-name="sidebarLogo" className="flex items-center gap-2.5 px-3 h-14 shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div
          data-name="sidebarLogoIcon"
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors duration-300 bg-primary/15"
        >
          <span data-name="sidebarLogoLetter" className="text-sm font-black transition-colors duration-300 text-primary">
            A
          </span>
        </div>
        {!collapsed && (
          <span data-name="sidebarBrand" className="text-base font-black tracking-tight whitespace-nowrap">
            <span className="text-foreground">AI</span>
            <span className="text-primary transition-colors duration-300">LL</span>
          </span>
        )}
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} data-name="sidebarMobileCloseBtn" className="ml-auto text-foreground-tertiary hover:text-foreground">
            <IconClose size={18} />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">

        {/* 主导航 */}
        <nav data-name="sidebarMainNav" className="space-y-0.5">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href.split('?')[0]) && (
              !link.href.includes('?tab=') || new URLSearchParams(location.search).get('tab') === link.href.split('tab=')[1]
            );
            const badgeCount = link.tab === 'messages' ? unreadNotificationCount + unreadMessages : 0;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => mobileOpen && setMobileOpen(false)}
                data-name={`sidebarNav${link.tab}${active ? 'Active' : ''}`}
                className={`sidebarNavItem relative ${active ? 'bg-primary/12 text-primary' : ''}`}
                title={collapsed ? link.label : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-primary"
                  />
                )}
                <div className="relative shrink-0">
                  <Icon size={18} className="shrink-0" />
                  {badgeCount > 0 && (
                    <span data-name={`sidebar${link.tab}Badge`} className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold px-0.5">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 个人区 */}
        <div data-name="sidebarPersonal" className="pt-2 border-t border-border/40 space-y-0.5">
          {!collapsed && isAuthenticated && (
            <div data-name="sidebarPersonalTitle" className="text-xs font-bold uppercase tracking-widest text-foreground-tertiary/70 mb-1.5 px-2">
              个人
            </div>
          )}

          {isAuthenticated ? (
            <>
              {visiblePersonal.map((item) => {
                switch (item.id) {
                  case 'favorites':
                    return (
                      <Link key={item.id} to="/me?tab=favorites" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebarFavorites" className="sidebarNavItem" title={collapsed ? "收藏" : undefined}>
                        <IconHeart size={18} />
                        {!collapsed && <span>收藏</span>}
                      </Link>
                    );
                  default:
                    return null;
                }
              })}
            </>
          ) : (
            !collapsed && (
              <div data-name="sidebarAuth" className="px-1 space-y-1.5">
                <Link to="/login" onClick={() => mobileOpen && setMobileOpen(false)} data-name="sidebarLoginBtn" className="sidebarNavItem w-full justify-center border border-border">
                  登录
                </Link>
                <Link
                  to="/register"
                  onClick={() => mobileOpen && setMobileOpen(false)}
                  data-name="sidebarRegisterBtn"
                  className="flex items-center justify-center rounded-lg py-2 text-sm font-medium text-white transition-all bg-primary"
                >
                  注册
                </Link>
              </div>
            )
          )}

          {/* 退出 */}
          {isAuthenticated && (
            <button onClick={handleLogout} data-name="sidebarLogoutBtn" className="sidebarNavItem w-full text-destructive hover:text-destructive" title={collapsed ? "退出" : undefined}>
              <IconLogout size={18} />
              {!collapsed && <span>退出</span>}
            </button>
          )}
        </div>
      </div>

      {/* Collapse button - fixed at bottom */}
      <div data-name="sidebarCollapseWrap" className="hidden lg:flex items-center justify-center border-t border-border/40 py-2 bg-card/50 backdrop-blur-sm">
        <button onClick={toggle} data-name="sidebarCollapseBtn" className="flex items-center justify-center h-7 w-7 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-muted transition-colors">
          {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        data-name="sidebarDesktop"
        className={`layoutLeft ${collapsed ? "collapsed railMode" : ""} ${collapsed && hoverExpanded ? "hoverExpanded" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div data-name="sidebarMobileOverlay" className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div data-name="sidebarMobileBackdrop" className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
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
