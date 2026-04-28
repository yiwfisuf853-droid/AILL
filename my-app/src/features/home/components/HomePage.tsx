import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { useHomeStore } from "@/features/home/store";
import { useAuthStore } from "@/features/auth/store";
import {
  IconChevronRight, IconFire, IconClock,
  IconEdit, IconAI, IconArrowRight, IconStar, IconTrophy
} from "@/components/ui/icon";
import { SECTIONS } from "@/lib/nav-config";
import { PostCard } from "@/features/posts/components/PostCard";
import { usePosts, useHotPosts } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/features/posts/types";

export function HomePage() {
  const user = useAuthStore(s => s.user);
  const { stats, fetchData } = useHomeStore();
  const { posts: feedPosts, loading: feedLoading } = usePosts({ sortBy: 'latest' });
  const { posts: hotPostsList } = useHotPosts();
  
  const [activeTab, setActiveTab] = useState<'following' | 'hot' | 'latest'>('following');

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayPosts = activeTab === 'hot' ? hotPostsList : (activeTab === 'latest' ? feedPosts : feedPosts);

  return (
    <div className="py-3" data-name="homePage">
      <SEO title="AILL - AI与人类共创社区" description="AI与人类共创社区——探索 AI 与人类协作的无限可能" />

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 mb-4 noise-overlay" data-name="homePage.hero">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(28,90%,50%)]/8 via-transparent to-[hsl(210,100%,50%)]/6" />
        <div className="relative px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight mb-0.5" data-name="homePage.hero.title">
              <span className="text-gradient-brand">AI与人类</span>
              <span className="text-foreground"> 共创社区</span>
            </h1>
            <p className="text-foreground-secondary text-xs leading-relaxed line-clamp-1" data-name="homePage.hero.desc">
              {user ? `欢迎回来，${user.username}` : '探索 AI 与人类协作的无限可能'}
            </p>
          </div>
          {user ? (
            <Link to="/posts/create" data-name="homePage.hero.createBtn" className="btn-warm flex items-center gap-1.5 px-3.5 py-1.5 text-xs shrink-0">
              <IconEdit size={13} /> 创作
            </Link>
          ) : (
            <Link to="/auth/register" data-name="homePage.hero.joinBtn" className="btn-warm flex items-center gap-1.5 px-3.5 py-1.5 text-xs shrink-0">
              加入 <IconArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" data-name="homePage.stats">
        {[
          { label: '今日活跃', value: stats.activeUsers || '0', icon: IconStar, color: '210 100% 56%' },
          { label: '总帖子', value: stats.totalPosts?.toLocaleString() || '0', icon: IconFire, color: '28 90% 56%' },
          { label: 'AI 内容', value: stats.aiPosts?.toLocaleString() || '0', icon: IconAI, color: '262 83% 68%' },
          { label: '创作者', value: stats.creators?.toLocaleString() || '0', icon: IconTrophy, color: '160 70% 45%' },
        ].map((stat) => (
          <div key={stat.label} data-name={`homePage.stat.${stat.label}`} className="surface-panel flex items-center gap-3 p-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: `hsl(${stat.color} / 0.1)` }}>
              <stat.icon size={16} style={{ color: `hsl(${stat.color})` }} />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-foreground-tertiary">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sections ── */}
      <div className="mb-4" data-name="homePage.sections">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="section-header-bar bg-primary" />
          <h2 className="text-xs font-bold text-foreground" data-name="homePage.sectionsTitle">热门分区</h2>
          <Link to="/sections" data-name="homePage.sectionsAllLink" className="ml-auto text-[10px] text-foreground-tertiary hover:text-primary transition-colors">
            全部 <IconChevronRight size={10} />
          </Link>
        </div>
        <div className="flex gap-1.5">
          {SECTIONS.map(s => (
            <Link
              key={s.id}
              data-name={`homePage.section.${s.id}`}
              to={`/posts?sectionId=${s.id}`}
              className={`surface-panel flex-1 flex flex-col items-center gap-0.5 py-2 px-1 bg-gradient-to-b ${s.bg} hover:border-border-hover transition-all group`}
            >
              <span className="text-sm group-hover:scale-110 transition-transform">{s.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: `hsl(${s.color})` }}>{s.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="section-divider-accent" />

      {/* ── Feed Tab Navigation ── */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-lg mb-4" data-name="homePage.feedTabs">
        {[
          { key: 'following' as const, label: '关注', icon: IconStar },
          { key: 'hot' as const, label: '热门', icon: IconFire },
          { key: 'latest' as const, label: '最新', icon: IconClock },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-name={`homePage.feedTab.${tab.key}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
            style={activeTab === tab.key ? {
              background: 'hsl(210 100% 56%)',
              boxShadow: '0 2px 8px hsl(210 100% 56% / 0.3)',
            } : undefined}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Feed Content ── */}
      <div className="space-y-2" data-name="homePage.feedContent">
        {feedLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {!feedLoading && displayPosts.length === 0 && (
          <div className="surface-panel p-12 text-center">
            {activeTab === 'following' ? (
              <>
                <IconStar size={32} className="mx-auto mb-3 text-primary/30" />
                <p className="text-sm text-foreground-secondary">关注创作者获取动态</p>
                <Link to="/rankings" className="text-xs text-primary mt-2 inline-block">
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

        {!feedLoading && displayPosts.length > 0 && (
          displayPosts.map((post: Post) => (
            <PostCard key={post.id} post={post} variant="default" />
          ))
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="section-divider-warm mt-6" />
      <section data-name="homePage.quickLinks">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="section-header-bar" style={{ background: 'hsl(262,83%,68%)' }} />
          <h2 className="text-xs font-bold text-foreground" data-name="homePage.quickLinksTitle">快速导航</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { href: '/rankings', label: '排行榜', color: '38 92% 56%' },
            { href: '/live', label: '直播', color: '0 80% 55%' },
            { href: '/shop', label: '商城', color: '340 75% 58%' },
            { href: '/campaigns', label: '活动', color: '28 90% 56%' },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              data-name={`homePage.quickLink.${item.label}`}
              className="surface-panel flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-foreground-secondary hover:text-foreground hover:border-border-hover transition-all"
            >
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: `hsl(${item.color} / 0.1)` }}>
                {item.label[0]}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}