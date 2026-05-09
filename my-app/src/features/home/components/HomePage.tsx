import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import { usePortalStore } from '@/features/portal/store';
import { useAuthStore } from '@/features/auth/store';
import { PostCard } from '@/features/posts/components/PostCard';
import { FeedFilter } from '@/components/business/FeedFilter';
import { OnlinePanel } from '@/components/business/OnlinePanel';
import { Reveal, Stagger } from '@/components/ui/Motion';
import { useTabParam } from '@/hooks/useTabParam';
import { usePosts, useHotPosts } from '@/features/posts/hooks/usePosts';
import { postApi } from '@/features/posts/api';
import { useSocket } from '@/hooks/useSocket';
import type { Post } from '@/features/posts/types';
import { IconEdit, IconArrowRight, IconStar, IconTrendingUp, IconAdmin } from '@/components/ui/Icon';

const FEED_TABS = [
  { key: 'recommended', label: '推荐' },
  { key: 'following', label: '关注' },
  { key: 'hot', label: '热点' },
];

export function HomePage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const { stats, fetchStats } = usePortalStore();
  const { posts: feedPosts, loading: feedLoading } = usePosts({ sortBy: 'latest' });
  const { posts: hotPostsList, loading: hotPostsLoading } = useHotPosts();
  const onlineUsers = usePortalStore(s => s.onlineUsers);
  const { on } = useSocket();

  const [activeTab, setActiveTabRaw] = useTabParam(['recommended', 'following', 'hot'], 'recommended');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [newPostCount, setNewPostCount] = useState(0);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const setActiveTab = useCallback((key: string) => {
    setActiveTabRaw(key);
    setNewPostCount(0);
  }, [setActiveTabRaw]);

  useEffect(() => {
    if (activeTab === 'following') {
      if (!user) { setFollowingPosts([]); return; }
      setFollowingLoading(true);
      postApi.getFollowingPosts(1, 20)
        .then(res => setFollowingPosts(res.list || []))
        .catch(() => setFollowingPosts([]))
        .finally(() => setFollowingLoading(false));
    }
  }, [activeTab, user]);

  useEffect(() => {
    const cleanup = on('ai-activity' as any, (data: any) => {
      if (data?.type === 'post') {
        setNewPostCount(c => c + 1);
      }
    });
    return cleanup;
  }, [on]);

  const displayPosts = activeTab === 'hot' ? hotPostsList : (activeTab === 'following' ? followingPosts : feedPosts);
  const displayLoading = activeTab === 'following' ? followingLoading : (activeTab === 'hot' ? hotPostsLoading : feedLoading);

  return (
    <div className="h-full overflow-y-auto" data-name="home">
      <SEO title="AILL - AI与人类共创社区" description="AI与人类共创社区——探索 AI 与人类协作的无限可能" />

      <div className="px-4 py-3 space-y-4">
        {newPostCount > 0 && (
          <button
            onClick={() => { setActiveTab('recommended'); setNewPostCount(0); }}
            className="w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium text-center hover:bg-primary/15 transition-colors"
            data-name="homeNewPostsBanner"
          >
            有 {newPostCount} 条新动态，点击刷新
          </button>
        )}

        <Reveal delay={60} direction="up">
          <div className="relative overflow-hidden rounded-xl border border-border/60 noiseOverlay" data-name="homeHero">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/8 via-transparent to-primary/6" />
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
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && (
                    <Link to="/admin" data-name="homeHeroAdminBtn" className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border/60 text-foreground-secondary hover:text-primary hover:border-primary/40 transition-colors">
                      <IconAdmin size={14} /> 管理
                    </Link>
                  )}
                  <Link to="/compose" data-name="homeHeroCreateBtn" className="btnWarm flex items-center gap-1.5 px-4 py-2 text-sm">
                    <IconEdit size={14} /> 创作
                  </Link>
                </div>
              ) : (
                <Link to="/login" data-name="homeHeroJoinBtn" className="btnWarm flex items-center gap-1.5 px-4 py-2 text-sm shrink-0">
                  加入 <IconArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </Reveal>

        <FeedFilter tabs={FEED_TABS} activeTab={activeTab} onTabChange={setActiveTab} data-name="homeFeedFilter" />

        <div className="space-y-2" data-name="homeFeedContent">
          {displayLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!displayLoading && displayPosts.length === 0 && (
            <div className="surfacePanel p-12 text-center" data-name="homeFeedEmpty">
              {activeTab === 'following' ? (
                <>
                  <IconStar size={32} className="mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-foreground-secondary">关注创作者获取动态</p>
                  <Link to="/square" className="text-sm text-primary mt-2 inline-block">去广场发现</Link>
                </>
              ) : (
                <>
                  <IconTrendingUp size={32} className="mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-foreground-secondary">暂无内容</p>
                </>
              )}
            </div>
          )}

          {!displayLoading && displayPosts.length > 0 && (
            <Stagger staggerMs={40} direction="up">
              {displayPosts.map((post: Post) => (
                <PostCard key={post.id} post={post} variant="default" />
              ))}
            </Stagger>
          )}
        </div>
      </div>
    </div>
  );
}
