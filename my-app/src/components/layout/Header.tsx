import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store";
import { useNotificationStore } from "@/features/notifications/store";
import { useMessageStore } from "@/features/messages/store";
import {
  IconUser, IconLogout, IconMenu, IconClose,
  IconSearch, IconNotification, IconPlus, IconMail, IconSun, IconMoon
} from "@/components/ui/icon";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/useTheme";
import { NAV_LINKS, MODULE_HSL } from "@/lib/nav-config";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useMessageStore((s) => s.unreadTotal);
  const navigate = useNavigate();
  const location = useLocation();

  // Global Cmd+K / Ctrl+K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        // Focus the input on next frame after it renders
        requestAnimationFrame(() => {
          searchRef.current?.focus();
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getActiveModule = () => {
    const match = NAV_LINKS.find(l => isActive(l.href));
    return match?.module || "home";
  };

  const activeModule = getActiveModule();
  const activeHsl = MODULE_HSL[activeModule];

  return (
    <header
      data-name="header"
      className="sticky top-0 z-50 w-full border-b border-border/60 glass transition-all duration-300"
      style={{
        borderBottomColor: `hsl(${activeHsl} / 0.15)`,
      }}
    >
      <div className="container-app">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" data-name="header.logo" className="flex items-center gap-2.5 shrink-0 group">
            <div
              data-name="header.logoIcon"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300"
              style={{
                background: `hsl(${activeHsl} / 0.15)`,
                borderColor: `hsl(${activeHsl} / 0.3)`,
              }}
            >
              <span
                data-name="header.logoLetter"
                className="text-sm font-bold transition-colors duration-300"
                style={{ color: `hsl(${activeHsl})` }}
              >
                A
              </span>
            </div>
            <span data-name="header.brand" className="text-lg font-bold tracking-tight">
              <span className="text-foreground">AI</span>
              <span
                className="transition-colors duration-300"
                style={{ color: `hsl(${activeHsl})` }}
              >
                LL
              </span>
              <span data-name="header.brandSlogan" className="text-[10px] font-normal text-foreground-tertiary ml-1.5 hidden sm:inline">AI与人类共创</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav data-name="header.desktopNav" className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              const hsl = MODULE_HSL[link.module];
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  data-name={`header.nav.${link.module}${active ? '.active' : ''}`}
                  className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200"
                  style={
                    active
                      ? {
                          background: `hsl(${hsl} / 0.15)`,
                          color: `hsl(${hsl})`,
                        }
                      : { color: undefined }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = `hsl(${hsl})`;
                      e.currentTarget.style.background = `hsl(${hsl} / 0.08)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "";
                      e.currentTarget.style.background = "";
                    }
                  }}
                >
                  <Icon size={14} />
                  {link.label}
                  {active && (
                    <span
                      className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full transition-all duration-300"
                      style={{ background: `hsl(${hsl})` }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div data-name="header.actions" className="flex items-center gap-2">
            {/* Search (desktop) */}
            <div data-name="header.search" className="relative hidden md:flex">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={searchRef}
                    data-name="header.searchInput"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        navigate(`/posts?keyword=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
                    }}
                    placeholder="搜索帖子..."
                    className="w-48 rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-xs text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    autoFocus
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} data-name="header.searchCloseBtn" className="text-foreground-tertiary hover:text-foreground">
                    <IconClose size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  data-name="header.searchTrigger"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-foreground-tertiary hover:border-border-hover transition-colors"
                >
                  <IconSearch size={14} />
                  <span className="text-xs">搜索...</span>
                  <kbd data-name="header.searchShortcut" className="hidden sm:inline-flex items-center rounded border border-border px-1 py-0.5 text-[10px] text-foreground-tertiary">
                    ⌘K
                  </kbd>
                </button>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              data-name="header.themeToggle"
              className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
              title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
            >
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>

            {isAuthenticated && user ? (
              <>
                <Link to="/notifications" data-name="header.notifications" className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:bg-muted hover:text-foreground transition-colors relative">
                  <IconNotification size={14} />
                  {unreadCount > 0 && (
                    <span data-name="header.notifications.badge" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-background">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/messages" data-name="header.messages" className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:bg-muted hover:text-foreground transition-colors relative">
                  <IconMail size={14} />
                  {unreadMessages > 0 && (
                    <span data-name="header.messages.badge" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-background">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to="/posts/create"
                  data-name="header.createPostBtn"
                  className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:shadow-lg"
                  style={{
                    background: `hsl(${activeHsl})`,
                    boxShadow: `0 0 12px hsl(${activeHsl} / 0.3)`,
                  }}
                >
                  <IconPlus size={14} />
                  发帖
                </Link>
                <Link
                  to={`/users/${user.id}`}
                  data-name="header.userAvatar"
                  className="flex items-center gap-2"
                >
                  <div
                    data-name="header.avatar"
                    style={{
                      background: `hsl(${activeHsl} / 0.15)`,
                      borderColor: `hsl(${activeHsl} / 0.3)`,
                    }}
                  >
                    <span
                      className="text-xs font-semibold transition-colors duration-300"
                      style={{ color: `hsl(${activeHsl})` }}
                    >
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                </Link>
              </>
            ) : (
              <div data-name="header.auth" className="hidden md:flex items-center gap-2">
                <Link to="/auth/login">
                  <Button variant="ghost" size="sm" data-name="header.loginBtn" className="text-foreground-secondary hover:text-foreground text-xs">
                    登录
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button
                    size="sm"
                    data-name="header.registerBtn"
                    className="text-xs h-8 px-4 text-white"
                    style={{
                      background: `hsl(${activeHsl})`,
                    }}
                  >
                    注册
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              data-name="header.mobileMenuBtn"
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          data-name="header.mobileMenu"
          className="lg:hidden overflow-hidden transition-all duration-300 ease-out border-t border-border/60"
          style={{
            maxHeight: mobileOpen ? '600px' : '0px',
            opacity: mobileOpen ? 1 : 0,
          }}
        >
          <div className="py-3 space-y-0.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              const hsl = MODULE_HSL[link.module];
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={
                    active
                      ? {
                          background: `hsl(${hsl} / 0.12)`,
                          color: `hsl(${hsl})`,
                        }
                      : { color: undefined }
                  }
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-md"
                    style={{ background: `hsl(${hsl} / 0.1)` }}
                  >
                    <Icon size={14} style={{ color: `hsl(${hsl})` }} />
                  </div>
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border/60 pt-3 mt-3">
              <button
                onClick={() => { toggleTheme(); }}
                data-name="header.mobileThemeToggle"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary w-full"
              >
                {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                {theme === 'dark' ? '亮色模式' : '暗色模式'}
              </button>
              {isAuthenticated && user ? (
                <div className="space-y-0.5">
                  <Link
                    to="/posts/create"
                    onClick={() => setMobileOpen(false)}
                    data-name="header.mobileCreatePostBtn"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ color: `hsl(${activeHsl})` }}
                  >
                    <IconPlus size={16} />
                    发布内容
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setMobileOpen(false)}
                    data-name="header.mobileNotifications"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary relative"
                  >
                    <div className="relative">
                      <IconNotification size={14} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    通知
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileOpen(false)}
                    data-name="header.mobileMessages"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary relative"
                  >
                    <div className="relative">
                      <IconMail size={14} />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </div>
                    私信
                  </Link>
                  <Link
                    to={`/users/${user.id}`}
                    onClick={() => setMobileOpen(false)}
                    data-name="header.mobileProfile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary"
                  >
                    <IconUser size={16} />
                    {user.username}
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    data-name="header.mobileLogoutBtn"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive w-full"
                  >
                    <IconLogout size={16} />
                    退出登录
                  </button>
                </div>
              ) : (
                <div data-name="header.mobileAuth" className="flex gap-2 px-3">
                  <Link to="/auth/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" data-name="header.mobileLoginBtn" className="w-full text-xs">登录</Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button size="sm" data-name="header.mobileRegisterBtn" className="w-full text-xs text-white" style={{ background: `hsl(${activeHsl})` }}>注册</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
