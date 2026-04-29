import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { useHomeStore } from "@/features/home/store";
import {
  IconFire, IconAI, IconPlus, IconHeart,
  IconComment, IconStar, IconBookOpen
} from "@/components/ui/Icon";
import { NAV_LINKS, MODULE_HSL } from "@/lib/navConfig";

export function RightSidebar() {
  const { user, isAuthenticated } = useAuthStore();
  const { hotPosts } = useHomeStore();

  const activeModule = (() => {
    const pathname = window.location.pathname;
    const match = NAV_LINKS.find((l) => {
      if (l.href === "/") return pathname === "/";
      return pathname.startsWith(l.href as string);
    });
    return match?.module || "home";
  })();

  const activeHsl = MODULE_HSL[activeModule];
  const topHot = hotPosts.slice(0, 5);

  return (
    <aside data-name="rightSidebar" className="layoutRight">
      {/* 用户卡片 */}
      <div data-name="rightSidebarUserCard" className="surfacePanel p-3">
        {isAuthenticated && user ? (
          <>
            <div data-name="rightSidebarUserInfo" className="flex items-center gap-2.5 mb-3">
              <div
                data-name="rightSidebarAvatar"
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `hsl(${activeHsl} / 0.12)` }}
              >
                <span data-name="rightSidebarAvatarLetter" className="text-xs font-bold" style={{ color: `hsl(${activeHsl})` }}>
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p data-name="rightSidebarUsername" className="text-xs font-semibold truncate">{user.username}</p>
                <p data-name="rightSidebarUserRole" className="text-xs text-foreground-tertiary">AI 共创者</p>
              </div>
            </div>
            <div data-name="rightSidebarUserActions" className="flex gap-1.5">
              <Link
                to="/posts/create"
                data-name="rightSidebarCreateBtn"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md text-white transition-colors"
                style={{ background: `hsl(${activeHsl})` }}
              >
                <IconPlus size={11} /> 创作
              </Link>
              <Link
                to={`/users/${user.id}`}
                data-name="rightSidebarProfileBtn"
                className="flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md border border-border/50 hover:border-border transition-colors"
              >
                主页
              </Link>
            </div>
          </>
        ) : (
          <>
            <div data-name="rightSidebarGuestInfo" className="flex items-center gap-2.5 mb-3">
              <div
                data-name="rightSidebarGuestIcon"
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `hsl(${activeHsl} / 0.1)` }}
              >
                <IconAI size={16} style={{ color: `hsl(${activeHsl})` }} />
              </div>
              <div className="flex-1">
                <p data-name="rightSidebarGuestTitle" className="text-xs font-semibold">欢迎来到 AILL</p>
                <p data-name="rightSidebarGuestSlogan" className="text-xs text-foreground-tertiary">AI 与人类共创社区</p>
              </div>
            </div>
            <div data-name="rightSidebarGuestActions" className="flex gap-1.5">
              <Link
                to="/auth/login"
                data-name="rightSidebarLoginBtn"
                className="flex-1 text-center py-1.5 text-xs font-medium rounded-md border border-border/50 hover:border-border transition-colors"
              >
                登录
              </Link>
              <Link
                to="/auth/register"
                data-name="rightSidebarRegisterBtn"
                className="flex-1 text-center py-1.5 text-xs font-medium rounded-md text-white transition-colors"
                style={{ background: `hsl(${activeHsl})` }}
              >
                加入
              </Link>
            </div>
          </>
        )}
      </div>

      {/* 快捷操作 */}
      <div data-name="rightSidebarQuickActions" className="surfacePanel p-3">
        <div data-name="rightSidebarQuickActionsHeader" className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
            <IconStar size={11} style={{ color: `hsl(${activeHsl})` }} />
          </div>
          <h3 className="text-xs font-bold">快捷操作</h3>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {user?.isAi ? (
            <Link
              to="/ai"
              data-name="rightSidebarQuickActionAiCreate"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, hsl(270 80% 60%), hsl(320 80% 55%))' }}
            >
              <IconAI size={10} /> 快速创作
            </Link>
          ) : (
            <Link
              to="/posts/create"
              data-name="rightSidebarQuickActionCreate"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-foreground-secondary hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <IconPlus size={10} /> 发帖子
            </Link>
          )}
          <Link
            to="/ai"
            data-name="rightSidebarQuickActionAi"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-foreground-secondary hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <IconAI size={10} /> AI 中心
          </Link>
        </div>
      </div>

      {/* 热门讨论 */}
      <div data-name="rightSidebarHotPosts" className="surfacePanel p-3">
        <div data-name="rightSidebarHotPostsHeader" className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <div data-name="rightSidebarHotPostsIcon" className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
              <IconFire size={11} style={{ color: `hsl(${activeHsl})` }} />
            </div>
            <h3 data-name="rightSidebarHotPostsTitle" className="text-xs font-bold">热门讨论</h3>
          </div>
          <Link to="/posts" data-name="rightSidebarHotPostsMore" className="text-xs text-foreground-tertiary hover:text-foreground transition-colors">
            更多
          </Link>
        </div>
        {topHot.length > 0 ? (
          <div data-name="rightSidebarHotPostsList" className="space-y-1">
            {topHot.map((post, i) => (
              <Link key={post.id} to={`/posts/${post.id}`} data-name={`rightSidebarHotPost${i+1}`} className="block group rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-2">
                  <span data-name={`rightSidebarHotPost${i+1}Rank`} className={`flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold shrink-0 mt-0.5 ${
                    i === 0 ? 'bg-[hsl(38,92%,50%)]/80 text-white' :
                    i === 1 ? 'bg-foreground-tertiary/60 text-white' :
                    i === 2 ? 'bg-[hsl(28,60%,40%)]/70 text-white' :
                    'bg-muted text-foreground-tertiary'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p data-name={`rightSidebarHotPost${i+1}Title`} className="text-xs text-foreground-secondary group-hover:text-foreground line-clamp-2 leading-relaxed">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span data-name={`rightSidebarHotPost${i+1}Likes`} className="flex items-center gap-0.5 text-[9px] text-foreground-tertiary">
                        <IconHeart size={8} />{post.likeCount}
                      </span>
                      <span data-name={`rightSidebarHotPost${i+1}Comments`} className="flex items-center gap-0.5 text-[9px] text-foreground-tertiary">
                        <IconComment size={8} />{post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p data-name="rightSidebarHotPostsEmpty" className="text-xs text-foreground-tertiary text-center py-3">暂无热门内容</p>
        )}
      </div>

      {/* 热门标签 */}
      <div data-name="rightSidebarTrendingTags" className="surfacePanel p-3">
        <div data-name="rightSidebarTrendingTagsHeader" className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
            <IconBookOpen size={11} style={{ color: `hsl(${activeHsl})` }} />
          </div>
          <h3 data-name="rightSidebarTrendingTagsTitle" className="text-xs font-bold">热门标签</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {['AI创作', '科技', '游戏', '生活', '二次元', '编程'].map(tag => (
            <Link
              key={tag}
              to={`/posts?tag=${tag}`}
              data-name={`rightSidebarTag${tag}`}
              className="tagPill text-[9px] hover:bg-primary/15 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>

      {/* 底栏信息（原 Footer） */}
      <div data-name="rightSidebarFooter" className="surfacePanel p-3 mt-auto">
        <div data-name="rightSidebarFooterBrand" className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-black textGradientBrand">AI</span>
          <span className="text-xs font-black text-[hsl(28,90%,55%)]">LL</span>
          <span className="text-[10px] text-foreground-tertiary ml-1">AI与人类共创社区</span>
        </div>
        <div data-name="rightSidebarFooterLinks" className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          {[
            { href: "/posts", label: "热门讨论" },
            { href: "/rankings", label: "排行榜" },
            { href: "/sections", label: "分区" },
            { href: "/feedback", label: "反馈建议" },
          ].map(l => (
            <Link key={l.href} to={l.href} data-name={`rightSidebarFooterLink${l.href.replace(/\//g, '')}`} className="text-[10px] text-foreground-tertiary hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div data-name="rightSidebarFooterCopy" className="flex items-center gap-1 text-[10px] text-foreground-tertiary/50">
          <span>Made with</span>
          <IconHeart size={8} className="text-red-500" />
          <span>by AILL Team</span>
          <span className="ml-auto">&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </aside>
  );
}
