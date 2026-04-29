import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/features/auth/store";
import { useTheme } from "@/hooks/useTheme";
import { useSidebar } from "./SidebarContext";
import { useScroll } from "./ScrollContext";
import { NAV_LINKS, MODULE_HSL, SECTIONS } from "@/lib/navConfig";
import {
  IconMenu, IconSearch, IconClose, IconSun, IconMoon, IconChevronRight, IconPlus
} from "@/components/ui/Icon";
import { useState, useRef, useEffect } from "react";
import { getSidebarConfig } from "@/lib/navConfig";

export function TopBar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { isScrolled } = useScroll();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [sidebarConfig, setSidebarConfig] = useState(getSidebarConfig());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleConfigChange = () => {
      setSidebarConfig(getSidebarConfig());
    };
    window.addEventListener('sidebarConfigChanged', handleConfigChange);
    return () => window.removeEventListener('sidebarConfigChanged', handleConfigChange);
  }, []);

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
  const activeLabel = NAV_LINKS.find((l) => isActive(l.href))?.label || "首页";

  // 当前选中的分区（从 URL query 参数读取）
  const currentSectionId = new URLSearchParams(location.search).get('sectionId');

  // 构建面包屑
  const breadcrumbs: { label: string; href?: string }[] = [{ label: '首页', href: '/' }];
  if (location.pathname !== '/') {
    breadcrumbs.push({ label: activeLabel });
  }

  return (
    <header
      data-name="topBar"
      className={`sticky top-0 z-30 w-full border-b border-border/60 effectGlass transition-all duration-300`}
      style={{ borderBottomColor: `hsl(${activeHsl} / 0.15)` }}
    >
      <div className={`flex items-center justify-between gap-3 px-4 lg:pl-[232px] h-12 transition-all duration-300 ${collapsed ? 'lg:pl-[60px]' : ''}`}>
        {/* Left: Breadcrumb / Title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            data-name="topBarMenuBtn"
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <IconMenu size={20} />
          </button>

          <div className="flex items-center gap-1.5 min-w-0" data-name="topBarBreadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <IconChevronRight size={12} className="text-foreground-tertiary shrink-0" />}
                {crumb.href ? (
                  <Link to={crumb.href} className="text-xs text-foreground-tertiary hover:text-foreground transition-colors shrink-0">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-4 rounded-full shrink-0"
                      style={{ background: `hsl(${activeHsl})` }}
                    />
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center: Search - Full width available */}
        <div data-name="topBarSearch" className="flex-1 max-w-xl">
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                ref={searchRef}
                data-name="topBarSearchInput"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="搜索帖子..."
                className="w-full rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring/30"
                style={{ borderColor: `hsl(${activeHsl} / 0.3)`, boxShadow: `0 0 0 1px hsl(${activeHsl} / 0.1)` }}
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                data-name="topBarSearchCloseBtn"
                className="text-foreground-tertiary hover:text-foreground shrink-0 p-1"
              >
                <IconClose size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              data-name="topBarSearchTrigger"
              className="flex items-center gap-2 rounded-lg border border-border bg-background-elevated px-4 py-1.5 text-foreground-tertiary hover:border-border-hover transition-colors w-full"
            >
              <IconSearch size={14} className="shrink-0" />
              <span className="text-sm flex-1 text-left">搜索帖子...</span>
              <kbd data-name="topBarSearchShortcut" className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground-tertiary">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Right: Actions - Theme + Create + User */}
        <div className="flex items-center gap-1.5" data-name="topBarActions">
          <button
            onClick={toggleTheme}
            data-name="topBarThemeToggle"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>

          {isAuthenticated && (
            <Link
              to="/posts/create"
              data-name="topBarCreateBtn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: `hsl(${activeHsl})` }}
            >
              <IconPlus size={14} />
              创作
            </Link>
          )}

          {isAuthenticated && user ? (
            <Link to={`/users/${user.id}`} data-name="topBarUserAvatar" className="flex items-center gap-2">
              <div
                data-name="topBarAvatar"
                className="h-7 w-7 rounded-full flex items-center justify-center border transition-colors duration-300"
                style={{
                  background: `hsl(${activeHsl} / 0.15)`,
                  borderColor: `hsl(${activeHsl} / 0.3)`,
                }}
              >
                <span
                  data-name="topBarAvatarLetter"
                  className="text-xs font-semibold transition-colors duration-300"
                  style={{ color: `hsl(${activeHsl})` }}
                >
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </Link>
          ) : (
            <div data-name="topBarAuth" className="flex items-center gap-1.5">
              <Link to="/auth/login">
                <Button variant="ghost" size="sm" data-name="topBarLoginBtn" className="text-foreground-secondary hover:text-foreground text-xs h-7 px-3">
                  登录
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm" data-name="topBarRegisterBtn" className="text-xs h-7 px-3 text-white" style={{ background: `hsl(${activeHsl})` }}>
                  注册
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 分区标签条 - 仅在帖子页面显示 */}
      {location.pathname.startsWith('/posts') && (
        <div data-name="topBarSectionTabs" className={`flex items-center gap-1 px-4 py-1.5 overflow-x-auto scrollbar-none lg:pl-[232px] transition-all duration-300 ${collapsed ? 'lg:pl-[60px]' : ''}`}>
          <Link
            to="/posts"
            data-name="topBarSectionTabAll"
            className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              !currentSectionId && location.pathname === '/posts'
                ? 'text-white'
                : 'text-foreground-tertiary hover:text-foreground hover:bg-muted/50'
            }`}
            style={!currentSectionId && location.pathname === '/posts' ? { background: `hsl(${activeHsl})` } : undefined}
          >
            全部
          </Link>
          {SECTIONS.filter(s => {
            const config = sidebarConfig.sections.find(sec => sec.id === s.id);
            return config?.visible !== false;
          }).map((s) => (
            <Link
              key={s.id}
              to={`/posts?sectionId=${s.id}`}
              data-name={`topBarSectionTab${s.id}`}
              className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                currentSectionId === s.id
                  ? 'text-white'
                  : 'text-foreground-tertiary hover:text-foreground hover:bg-muted/50'
              }`}
              style={currentSectionId === s.id ? { background: `hsl(${s.color})` } : undefined}
            >
              <span className="text-sm">{s.icon}</span>
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
