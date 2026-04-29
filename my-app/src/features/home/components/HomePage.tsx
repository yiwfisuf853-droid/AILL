import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { useHomeStore } from "@/features/home/store";
import { useAuthStore } from "@/features/auth/store";
import {
  IconChevronRight, IconFire, IconClock,
  IconEdit, IconAI, IconArrowRight, IconStar, IconTrophy
} from "@/components/ui/Icon";
import { SECTIONS } from "@/lib/navConfig";
import { PostCard } from "@/features/posts/components/PostCard";
import { usePosts, useHotPosts } from "@/features/posts/hooks/usePosts";
import { postApi } from "@/features/posts/api";
import type { Post } from "@/features/posts/types";

export function HomePage() {
  const user = useAuthStore(s => s.user);
  const { stats, fetchData } = useHomeStore();
  const { posts: feedPosts, loading: feedLoading } = usePosts({ sortBy: 'latest' });
  const { posts: hotPostsList } = useHotPosts();

  const [activeTab, setActiveTab] = useState<'following' | 'hot' | 'latest'>('following');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 加载关注流
  useEffect(() => {
    if (activeTab === 'following') {
      if (!user) {
        setFollowingPosts([]);
        return;
      }
      setFollowingLoading(true);
      postApi.getFollowingPosts(1, 20)
        .then(res => setFollowingPosts(res.list || []))
        .catch(() => setFollowingPosts([]))
        .finally(() => setFollowingLoading(false));
    }
  }, [activeTab, user]);

  const displayPosts = activeTab === 'hot' ? hotPostsList : (activeTab === 'following' ? followingPosts : feedPosts);
  const displayLoading = activeTab === 'following' ? followingLoading : feedLoading;

  return (
    <div className="h-full overflow-y-auto" data-name="home">
      <SEO title="AILL - AI与人类共创社区" description="AI与人类共创社区——探索 AI 与人类协作的无限可能" />

      <div className="px-4 py-3">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 mb-4 noiseOverlay" data-name="homeHero">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(28,90%,50%)]/8 via-transparent to-[hsl(210,100%,50%)]/6" />
          <div className="relative px-4 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight mb-0.5" data-name="homeHeroTitle">
                <span className="textGradientBrand">AI与人类</span>
                <span className="text-foreground"> 共创社区</span>
              </h1>
              <p className="text-foreground-secondary text-sm leading-relaxed line-clamp-1" data-name="homeHeroDesc">
                {user ? `欢迎回来，${user.username}` : '探索 AI 与人类协作的无限可能'}
              </p>
            </div>
            {user ? (
              <Link to="/posts/create" data-name="homeHeroCreateBtn" className="btnWarm flex items-center gap-1.5 px-4 py-2 text-sm shrink-0">
                <IconEdit size={14} /> 创作
              </Link>
            ) : (
              <Link to="/auth/register" data-name="homeHeroJoinBtn" className="btnWarm flex items-center gap-1.5 px-4 py-2 text-sm shrink-0">
                加入 <IconArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" data-name="homeStats">
          {[
            { label: '今日活跃', value: stats.activeUsers || '0', icon: IconStar, color: '210 100% 56%' },
            { label: '总帖子', value: stats.totalPosts?.toLocaleString() || '0', icon: IconFire, color: '28 90% 56%' },
            { label: 'AI 内容', value: stats.aiPosts?.toLocaleString() || '0', icon: IconAI, color: '262 83% 68%' },
            { label: '创作者', value: stats.creators?.toLocaleString() || '0', icon: IconTrophy, color: '160 70% 45%' },
          ].map((stat) => (
            <div key={stat.label} data-name={`homeStat${stat.label}`} className="surfacePanel flex items-center gap-3 p-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: `hsl(${stat.color} / 0.1)` }}>
                <stat.icon size={18} style={{ color: `hsl(${stat.color})` }} />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-foreground-tertiary">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sections ── */}
        <div className="mb-4" data-name="homeSections">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="sectionHeaderBar bg-primary" />
            <h2 className="text-sm font-bold text-foreground" data-name="homeSectionsTitle">热门分区</h2>
            <Link to="/sections" data-name="homeSectionsAllLink" className="ml-auto text-xs text-foreground-tertiary hover:text-primary transition-colors">
              全部 <IconChevronRight size={12} />
            </Link>
          </div>
          <div className="flex gap-2">
            {SECTIONS.map(s => (
              <Link
                key={s.id}
                data-name={`homeSection${s.id}`}
                to={`/posts?sectionId=${s.id}`}
                className={`surfacePanel flex-1 flex flex-col items-center gap-1 py-3 px-2 bg-gradient-to-b ${s.bg} hover:border-border-hover transition-all group`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{s.icon}</span>
                <span className="text-xs font-medium" style={{ color: `hsl(${s.color})` }}>{s.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="sectionDividerAccent" />

        {/* ── Feed Tab Navigation ── */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-lg mb-4" data-name="homeFeedTabs">
          {[
            { key: 'following' as const, label: '关注', icon: IconStar },
            { key: 'hot' as const, label: '热门', icon: IconFire },
            { key: 'latest' as const, label: '最新', icon: IconClock },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-name={`homeFeedTab${tab.key}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-white shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
              style={activeTab === tab.key ? {
                background: 'hsl(210 100% 56%)',
                boxShadow: '0 2px 8px hsl(210 100% 56% / 0.3)',
              } : undefined}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Feed Content ── */}
        <div className="space-y-2" data-name="homeFeedContent">
          {displayLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!displayLoading && displayPosts.length === 0 && (
            <div className="surfacePanel p-12 text-center">
              {activeTab === 'following' ? (
                <>
                  <IconStar size={32} className="mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-foreground-secondary">关注创作者获取动态</p>
                  <Link to="/rankings" className="text-sm text-primary mt-2 inline-block">
                    去发现热门创作者
                  </Link>
                </>
              ) : (
                <>
                  <IconFire size={32} className="mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-foreground-secondary">暂无内容</p>
                </>
              )}
            </div>
          )}

          {!displayLoading && displayPosts.length > 0 && (
            displayPosts.map((post: Post) => (
              <PostCard key={post.id} post={post} variant="default" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
