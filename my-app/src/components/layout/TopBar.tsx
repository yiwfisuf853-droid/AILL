import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/features/auth/store";
import { useSidebar } from "./SidebarContext";
import { useScroll } from "./ScrollContext";
import { NAV_LINKS, SECTIONS } from "@/lib/navConfig";
import { getLayoutConfig } from "@/lib/layoutConfig";
import {
  IconMenu, IconSearch, IconClose, IconChevronRight
} from "@/components/ui/Icon";
import { useState, useRef, useEffect } from "react";

export function TopBar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { user, isAuthenticated } = useAuthStore();
  const { isScrolled } = useScroll();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const activeLabel = NAV_LINKS.find((l: typeof NAV_LINKS[number]) => isActive(l.href))?.label || "首页";

  // 当前选中的分区（从 URL query 参数读取）
  const currentSectionId = new URLSearchParams(location.search).get('sectionId');
  const layoutConfig = getLayoutConfig(location.pathname);
  const needsSidebarOffset = layoutConfig.showLeftSidebar;
  const showSectionTabs = location.pathname === '/square';
  const topBarOffsetClass = needsSidebarOffset
    ? collapsed
      ? 'lg:ml-[48px] lg:w-[calc(100%-48px)]'
      : 'lg:ml-[220px] lg:w-[calc(100%-220px)]'
    : '';

  // 构建面包屑
  const breadcrumbs: { label: string; href?: string }[] = [{ label: '首页', href: '/' }];
  if (location.pathname !== '/') {
    breadcrumbs.push({ label: activeLabel });
  }

  return (
    <header
      data-name="topBar"
      className={`sticky top-0 z-30 w-full border-b border-primary/15 effectGlass transition-all duration-300 ${topBarOffsetClass}`}
    >
      <div className={`flex items-center justify-between gap-3 px-3 sm:px-4 transition-all duration-300 ${isScrolled ? 'h-11' : 'h-10'}`}>
        {/* Left: Menu + Page title / Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            data-name="topBar.menuBtn"
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <IconMenu size={20} />
          </button>

          {isScrolled ? (
            <div className="flex items-center gap-1.5 min-w-0" data-name="topBar.breadcrumb">
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
                        className="w-1.5 h-4 rounded-full shrink-0 bg-primary"
                      />
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span data-name="topBar.pageTitle" className="text-sm font-semibold text-foreground-secondary lg:hidden">{activeLabel}</span>
          )}
        </div>

        {/* Center: Search */}
        <div data-name="topBar.search" className={`flex-1 mx-auto transition-all duration-300 ${isScrolled ? 'max-w-md' : 'max-w-sm'}`}>
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                ref={searchRef}
                data-name="topBar.searchInput"
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
                className="w-full rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/30 focus:shadow-[0_0_0_1px_var(--primary)/0.1]"
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                data-name="topBar.searchCloseBtn"
                className="text-foreground-tertiary hover:text-foreground shrink-0"
              >
                <IconClose size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              data-name="topBar.searchTrigger"
              className="flex items-center gap-2 rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-foreground-tertiary hover:border-border-hover transition-colors w-full"
            >
              <IconSearch size={14} className="shrink-0" />
              <span className="text-sm">搜索...</span>
              <kbd data-name="topBar.searchShortcut" className="hidden sm:inline-flex items-center rounded border border-border px-1 py-0.5 text-xs text-foreground-tertiary ml-auto">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Right: User */}
        <div className="flex items-center gap-2">

          {isAuthenticated && user ? (
            <Link to={`/users/${user.id}`} data-name="topBar.userAvatar" className="flex items-center gap-2">
              <div
                data-name="topBar.avatar"
                className="h-7 w-7 rounded-full flex items-center justify-center border border-primary/30 bg-primary/15 transition-colors duration-300"
              >
                <span
                  data-name="topBar.avatarLetter"
                  className="text-xs font-semibold text-primary transition-colors duration-300"
                >
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </Link>
          ) : (
            <div data-name="topBar.auth" className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" data-name="topBar.loginBtn" className="text-foreground-secondary hover:text-foreground text-sm">
                  登录
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" data-name="topBar.registerBtn" className="text-sm h-8 px-4 text-white bg-primary">
                  注册
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 分区标签条 */}
      {showSectionTabs && (
        <div data-name="topBar.sectionTabs" className="flex items-center gap-1 px-3 sm:px-4 pb-1 overflow-x-auto scrollbar-none transition-all duration-300">
        <Link
          to="/square"
          data-name="topBar.sectionTab.all"
          className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            !currentSectionId && location.pathname === '/square'
              ? 'text-white bg-primary'
              : 'text-foreground-tertiary hover:text-foreground hover:bg-muted/50'
          }`}
        >
          全部
        </Link>
        {SECTIONS.map((s: typeof SECTIONS[number]) => (
          <Link
            key={s.id}
            to={`/square?sectionId=${s.id}`}
            data-name={`topBar.sectionTab.${s.id}`}
            className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              currentSectionId === s.id
                ? 'text-white bg-primary'
                : 'text-foreground-tertiary hover:text-foreground hover:bg-muted/50'
            }`}
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
