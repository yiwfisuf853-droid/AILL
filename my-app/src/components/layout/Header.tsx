import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/features/auth/store";
import { useNotificationStore } from "@/features/messages/store";
import { useMessageStore } from "@/features/messages/store";
import {
  IconUser, IconLogout, IconMenu, IconClose,
  IconSearch, IconMail
} from "@/components/ui/Icon";
import { useState, useRef, useEffect } from "react";
import { NAV_LINKS } from "@/lib/navConfig";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadNotificationCount = useNotificationStore((s) => s.unreadNotificationCount);
  const unreadMessages = useMessageStore((s) => s.unreadTotal);
  const unreadTotal = unreadNotificationCount + unreadMessages;
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
    navigate("/home");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header
      data-name="header"
      className="sticky top-0 z-50 w-full border-b border-primary/15 effectGlass transition-all duration-300"
    >
      <div className="container-app">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" data-name="headerLogo" className="flex items-center gap-2.5 shrink-0 group">
            <div
              data-name="headerLogoIcon"
              className="flex h-8 w-8 items-center justify-center rounded-lg border bg-primary-muted border-primary/30 transition-all duration-300"
            >
              <span
                data-name="headerLogoLetter"
                className="text-sm font-bold text-primary transition-colors duration-300"
              >
                A
              </span>
            </div>
            <span data-name="headerBrand" className="text-lg font-bold tracking-tight">
              <span className="text-foreground">AI</span>
              <span className="text-primary">
                LL
              </span>
              <span data-name="headerBrandSlogan" className="text-xs font-normal text-foreground-tertiary ml-1.5 hidden sm:inline">AI与人类共创</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav data-name="headerDesktopNav" className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  data-name={`headerNav${link.tab}${active ? 'Active' : ''}`}
                  className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary-muted text-primary'
                      : 'text-foreground-secondary hover:text-primary hover:bg-primary/8'
                  }`}
                >
                  <Icon size={14} />
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary transition-all duration-300" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div data-name="headerActions" className="flex items-center gap-2">
            {/* Search (desktop) */}
            <div data-name="headerSearch" className="relative hidden md:flex">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={searchRef}
                    data-name="headerSearchInput"
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
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} data-name="headerSearchCloseBtn" className="text-foreground-tertiary hover:text-foreground">
                    <IconClose size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  data-name="headerSearchTrigger"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-foreground-tertiary hover:border-border-hover transition-colors"
                >
                  <IconSearch size={14} />
                  <span className="text-xs">搜索...</span>
                  <kbd data-name="headerSearchShortcut" className="hidden sm:inline-flex items-center rounded border border-border px-1 py-0.5 text-xs text-foreground-tertiary">
                    ⌘K
                  </kbd>
                </button>
              )}
            </div>

            {isAuthenticated && user ? (
              <>
                <Link to="/messages" data-name="headerMessages" className="hidden md:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-muted hover:text-foreground transition-colors relative">
                  <IconMail size={14} />
                  <span>消息</span>
                  {unreadTotal > 0 && (
                    <span data-name="headerMessagesBadge" className="ml-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold px-1">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                </Link>
                <Link
                  to={`/users/${user.id}`}
                  data-name="headerUserAvatar"
                  className="flex items-center gap-2"
                >
                  <div
                    data-name="headerAvatar"
                    className="flex h-8 w-8 items-center justify-center rounded-full border bg-primary-muted border-primary/30"
                  >
                    <span className="text-xs font-semibold text-primary">
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                </Link>
              </>
            ) : (
              <div data-name="headerAuth" className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" data-name="headerLoginBtn" className="text-foreground-secondary hover:text-foreground text-xs">
                    登录
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    size="sm"
                    data-name="headerRegisterBtn"
                    className="text-xs h-8 px-4 text-white bg-primary hover:bg-primary-hover"
                  >
                    注册
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              data-name="headerMobileMenuBtn"
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          data-name="headerMobileMenu"
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
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary-muted text-primary'
                      : 'text-foreground-secondary'
                  }`}
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                    <Icon size={14} className="text-primary" />
                  </div>
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border/60 pt-3 mt-3" data-name="headerMobileSecondary">
              {isAuthenticated && user ? (
                <div className="space-y-0.5">
                  <Link
                    to="/messages"
                    onClick={() => setMobileOpen(false)}
                    data-name="headerMobileMessages"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary relative"
                  >
                    <div className="relative">
                      <IconMail size={14} />
                      {unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold px-0.5">
                          {unreadTotal > 99 ? '99+' : unreadTotal}
                        </span>
                      )}
                    </div>
                    消息
                  </Link>
                  <Link
                    to={`/users/${user.id}`}
                    onClick={() => setMobileOpen(false)}
                    data-name="headerMobileProfile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary"
                  >
                    <IconUser size={16} />
                    {user.username}
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    data-name="headerMobileLogoutBtn"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive w-full"
                  >
                    <IconLogout size={16} />
                    退出登录
                  </button>
                </div>
              ) : (
                <div data-name="headerMobileAuth" className="flex gap-2 px-3">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" data-name="headerMobileLoginBtn" className="w-full text-xs">登录</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button size="sm" data-name="headerMobileRegisterBtn" className="w-full text-xs text-white bg-primary hover:bg-primary-hover">注册</Button>
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
