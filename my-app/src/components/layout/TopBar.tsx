import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store";
import { useTheme } from "@/lib/useTheme";
import { useSidebar } from "./SidebarContext";
import { NAV_LINKS, MODULE_HSL } from "@/lib/nav-config";
import {
  IconMenu, IconSearch, IconClose, IconSun, IconMoon
} from "@/components/ui/icon";
import { useState, useRef, useEffect } from "react";

export function TopBar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
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

  const getActiveModule = () => {
    const match = NAV_LINKS.find((l) => isActive(l.href));
    return match?.module || "home";
  };

  const activeModule = getActiveModule();
  const activeHsl = MODULE_HSL[activeModule];
  const activeLabel = NAV_LINKS.find((l) => isActive(l.href))?.label || "首页";

  return (
    <header
      data-name="topBar"
      className="sticky top-0 z-30 w-full border-b border-border/60 glass transition-all duration-300"
      style={{ borderBottomColor: `hsl(${activeHsl} / 0.15)` }}
    >
      <div className="flex h-12 items-center justify-between gap-4 px-4">
        {/* Left: Mobile toggle + Page title */}
        <div className="flex items-center gap-3">
          <button
            data-name="topBar.menuBtn"
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <IconMenu size={20} />
          </button>
          <span data-name="topBar.pageTitle" className="text-sm font-semibold text-foreground-secondary lg:hidden">{activeLabel}</span>
        </div>

        {/* Center: Search */}
        <div data-name="topBar.search" className="flex-1 max-w-md mx-auto">
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                ref={searchRef}
                data-name="topBar.searchInput"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/posts?keyword=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                placeholder="搜索帖子..."
                className="w-full rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-xs text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
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
              <span className="text-xs">搜索...</span>
              <kbd data-name="topBar.searchShortcut" className="hidden sm:inline-flex items-center rounded border border-border px-1 py-0.5 text-[10px] text-foreground-tertiary ml-auto">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Right: Theme + User */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            data-name="topBar.themeToggle"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-muted transition-colors"
            title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>

          {isAuthenticated && user ? (
            <Link to={`/users/${user.id}`} data-name="topBar.userAvatar" className="flex items-center gap-2">
              <div
                data-name="topBar.avatar"
                className="h-7 w-7 rounded-full flex items-center justify-center border transition-colors duration-300"
                style={{
                  background: `hsl(${activeHsl} / 0.15)`,
                  borderColor: `hsl(${activeHsl} / 0.3)`,
                }}
              >
                <span
                  data-name="topBar.avatarLetter"
                  className="text-xs font-semibold transition-colors duration-300"
                  style={{ color: `hsl(${activeHsl})` }}
                >
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </Link>
          ) : (
            <div data-name="topBar.auth" className="flex items-center gap-2">
              <Link to="/auth/login">
                <Button variant="ghost" size="sm" data-name="topBar.loginBtn" className="text-foreground-secondary hover:text-foreground text-xs">
                  登录
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm" data-name="topBar.registerBtn" className="text-xs h-8 px-4 text-white" style={{ background: `hsl(${activeHsl})` }}>
                  注册
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}