import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { useHomeStore } from "@/features/home/store";
import { useRankingsStore } from "@/features/rankings/store";
import { 
  IconUser, IconFire, IconTrophy, IconAI, IconPlus, IconHeart, 
  IconComment, IconStar, IconBookOpen
} from "@/components/ui/icon";
import { NAV_LINKS, MODULE_HSL } from "@/lib/nav-config";

export function RightSidebar() {
  const { user, isAuthenticated } = useAuthStore();
  const { hotPosts } = useHomeStore();
  const { rankings } = useRankingsStore();
  
  const location = useLocation();

  const getActiveModule = () => {
    const pathname = location.pathname;
    const match = NAV_LINKS.find((l) => {
      if (l.href === "/") return pathname === "/";
      return pathname.startsWith(l.href as string);
    });
    return match?.module || "home";
  };

  const activeModule = getActiveModule();
  const activeHsl = MODULE_HSL[activeModule];
  const topHot = hotPosts.slice(0, 5);

  return (
    <aside data-name="rightSidebar" className="layout-right">
      {/* User card */}
      <div data-name="rightSidebar.userCard" className="surface-panel p-3">
        {isAuthenticated && user ? (
          <>
            <div data-name="rightSidebar.userInfo" className="flex items-center gap-2.5 mb-3">
              <div
                data-name="rightSidebar.avatar"
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `hsl(${activeHsl} / 0.12)` }}
              >
                <span data-name="rightSidebar.avatarLetter" className="text-xs font-bold" style={{ color: `hsl(${activeHsl})` }}>
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p data-name="rightSidebar.username" className="text-xs font-semibold truncate">{user.username}</p>
                <p data-name="rightSidebar.userRole" className="text-[10px] text-foreground-tertiary">AI 共创者</p>
              </div>
            </div>
            <div data-name="rightSidebar.userActions" className="flex gap-1.5">
              <Link
                to="/posts/create"
                data-name="rightSidebar.createBtn"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md text-white transition-colors"
                style={{ background: `hsl(${activeHsl})` }}
              >
                <IconPlus size={11} /> 创作
              </Link>
              <Link
                to={`/users/${user.id}`}
                data-name="rightSidebar.profileBtn"
                className="flex-1 flex items-center justify-center py-1.5 text-[11px] font-medium rounded-md border border-border/50 hover:border-border transition-colors"
              >
                主页
              </Link>
            </div>
          </>
        ) : (
          <>
            <div data-name="rightSidebar.guestInfo" className="flex items-center gap-2.5 mb-3">
              <div
                data-name="rightSidebar.guestIcon"
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `hsl(${activeHsl} / 0.1)` }}
              >
                <IconAI size={16} style={{ color: `hsl(${activeHsl})` }} />
              </div>
              <div className="flex-1">
                <p data-name="rightSidebar.guestTitle" className="text-xs font-semibold">欢迎来到 AILL</p>
                <p data-name="rightSidebar.guestSlogan" className="text-[10px] text-foreground-tertiary">AI 与人类共创社区</p>
              </div>
            </div>
            <div data-name="rightSidebar.guestActions" className="flex gap-1.5">
              <Link
                to="/auth/login"
                data-name="rightSidebar.loginBtn"
                className="flex-1 text-center py-1.5 text-[11px] font-medium rounded-md border border-border/50 hover:border-border transition-colors"
              >
                登录
              </Link>
              <Link
                to="/auth/register"
                data-name="rightSidebar.registerBtn"
                className="flex-1 text-center py-1.5 text-[11px] font-medium rounded-md text-white transition-colors"
                style={{ background: `hsl(${activeHsl})` }}
              >
                加入
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div data-name="rightSidebar.quickActions" className="surface-panel p-3">
        <div data-name="rightSidebar.quickActionsHeader" className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
            <IconStar size={11} style={{ color: `hsl(${activeHsl})` }} />
          </div>
          <h3 className="text-[11px] font-bold">快速操作</h3>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { href: '/posts/create', label: '发帖子', icon: IconPlus },
            { href: '/ai', label: 'AI 中心', icon: IconAI },
            { href: '/shop', label: '积分商城', icon: IconStar },
            { href: '/campaigns', label: '做任务', icon: IconTrophy },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              data-name={`rightSidebar.quickAction.${item.label}`}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] text-foreground-secondary hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <item.icon size={10} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Hot discussions */}
      <div data-name="rightSidebar.hotPosts" className="surface-panel p-3">
        <div data-name="rightSidebar.hotPostsHeader" className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <div data-name="rightSidebar.hotPostsIcon" className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
              <IconFire size={11} style={{ color: `hsl(${activeHsl})` }} />
            </div>
            <h3 data-name="rightSidebar.hotPostsTitle" className="text-[11px] font-bold">热门讨论</h3>
          </div>
          <Link to="/posts" data-name="rightSidebar.hotPostsMore" className="text-[10px] text-foreground-tertiary hover:text-foreground transition-colors">
            更多
          </Link>
        </div>
        {topHot.length > 0 ? (
          <div data-name="rightSidebar.hotPostsList" className="space-y-1">
            {topHot.map((post, i) => (
              <Link key={post.id} to={`/posts/${post.id}`} data-name={`rightSidebar.hotPost.${i+1}`} className="block group rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-2">
                  <span data-name={`rightSidebar.hotPost.${i+1}.rank`} className={`flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold shrink-0 mt-0.5 ${
                    i === 0 ? 'bg-[hsl(38,92%,50%)]/80 text-white' :
                    i === 1 ? 'bg-foreground-tertiary/60 text-white' :
                    i === 2 ? 'bg-[hsl(28,60%,40%)]/70 text-white' :
                    'bg-muted text-foreground-tertiary'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p data-name={`rightSidebar.hotPost.${i+1}.title`} className="text-[11px] text-foreground-secondary group-hover:text-foreground line-clamp-2 leading-relaxed">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span data-name={`rightSidebar.hotPost.${i+1}.likes`} className="flex items-center gap-0.5 text-[9px] text-foreground-tertiary">
                        <IconHeart size={8} />{post.likeCount}
                      </span>
                      <span data-name={`rightSidebar.hotPost.${i+1}.comments`} className="flex items-center gap-0.5 text-[9px] text-foreground-tertiary">
                        <IconComment size={8} />{post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p data-name="rightSidebar.hotPostsEmpty" className="text-[10px] text-foreground-tertiary text-center py-3">暂无热门内容</p>
        )}
      </div>

      {/* Rankings */}
      {rankings.length > 0 && (
        <div data-name="rightSidebar.rankings" className="surface-panel p-3">
          <div data-name="rightSidebar.rankingsHeader" className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <div data-name="rightSidebar.rankingsIcon" className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
                <IconTrophy size={11} style={{ color: `hsl(${activeHsl})` }} />
              </div>
              <h3 data-name="rightSidebar.rankingsTitle" className="text-[11px] font-bold">创作榜单</h3>
            </div>
            <Link to="/rankings" data-name="rightSidebar.rankingsMore" className="text-[10px] text-foreground-tertiary hover:text-foreground transition-colors">
              全部
            </Link>
          </div>
          <div data-name="rightSidebar.rankingsList" className="space-y-1">
            {rankings.slice(0, 4).map((item, i) => (
              item.target ? (
                <Link key={item.id} to={`/posts/${item.targetId}`} data-name={`rightSidebar.ranking.${i+1}`} className="block group rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start gap-2">
                    <span data-name={`rightSidebar.ranking.${i+1}.rank`} className={`flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold shrink-0 mt-0.5 ${
                      i === 0 ? 'bg-[hsl(38,92%,50%)]/80 text-white' :
                      i === 1 ? 'bg-foreground-tertiary/60 text-white' :
                      i === 2 ? 'bg-[hsl(28,60%,40%)]/70 text-white' :
                      'bg-muted text-foreground-tertiary'
                    }`}>
                      {i + 1}
                    </span>
                    <p data-name={`rightSidebar.ranking.${i+1}.title`} className="text-[11px] text-foreground-secondary group-hover:text-foreground line-clamp-2 leading-relaxed flex-1">
                      {item.target.title}
                    </p>
                  </div>
                </Link>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* AI card */}
      <div data-name="rightSidebar.aiCard" className="rounded-lg border border-dashed border-border/40 p-3">
        <div data-name="rightSidebar.aiCardHeader" className="flex items-center gap-1.5 mb-1.5">
          <IconAI size={12} className="text-primary shrink-0" />
          <h3 data-name="rightSidebar.aiCardTitle" className="text-[11px] font-bold">AI 共创</h3>
        </div>
        <p data-name="rightSidebar.aiCardDesc" className="text-[10px] text-foreground-tertiary leading-relaxed mb-1.5">
          与 AI 协作润色文字、生成创意、优化表达。
        </p>
        <Link to="/ai" data-name="rightSidebar.aiCardLink" className="text-[10px] font-medium transition-colors" style={{ color: `hsl(${activeHsl})` }}>
          了解更多 →
        </Link>
      </div>

      {/* Trending Tags */}
      <div data-name="rightSidebar.trendingTags" className="surface-panel p-3">
        <div data-name="rightSidebar.trendingTagsHeader" className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center justify-center w-5 h-5 rounded-md" style={{ background: `hsl(${activeHsl} / 0.1)` }}>
            <IconBookOpen size={11} style={{ color: `hsl(${activeHsl})` }} />
          </div>
          <h3 data-name="rightSidebar.trendingTagsTitle" className="text-[11px] font-bold">热门标签</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {['AI创作', '科技', '游戏', '生活', '二次元', '编程'].map(tag => (
            <Link
              key={tag}
              to={`/posts?tag=${tag}`}
              data-name={`rightSidebar.tag.${tag}`}
              className="tag-pill text-[9px] hover:bg-primary/15 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}