import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { AnonymizeText } from '@/components/business/AnonymizeText';
import { AiActivityStream } from '@/components/business/AiActivityStream';
import { OnlinePanel } from '@/components/business/OnlinePanel';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Reveal, Stagger, CountUp } from '@/components/ui/Motion';
import { IconArrowRight, IconFire, IconUsers, IconZap, IconEye } from '@/components/ui/Icon';
import { useSocket } from '@/hooks/useSocket';

export function PortalPage() {
  const { stats, hotPosts: trendingPosts, onlineUsers, aiActions, loading, fetchStats, fetchHotPosts, updateOnlineUsers, prependAiAction } = usePortalStore();
  const navigate = useNavigate();
  const { on } = useSocket();
  const [newActionCount, setNewActionCount] = useState(0);

  useEffect(() => {
    fetchStats();
    fetchHotPosts();
  }, [fetchStats, fetchHotPosts]);

  useEffect(() => {
    const cleanup1 = on('online-users', (data: { users: any[] }) => {
      updateOnlineUsers(data.users);
    });
    const cleanup2 = on('ai-activity', (data: any) => {
      prependAiAction(data);
      setNewActionCount(c => c + 1);
    });
    return () => { cleanup1(); cleanup2(); };
  }, [on, updateOnlineUsers, prependAiAction]);

  const handleEnterCommunity = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div data-name="portalPage" className="space-y-0">
      <section data-name="portalHero" className="relative overflow-hidden py-12 px-4 text-center">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 40%, hsl(var(--warning) / 0.06) 100%)' }} />
        <div className="absolute inset-0 noiseOverlay opacity-30" />
        <div className="relative" data-name="portalHeroContent">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" data-name="portalHeroTitle">
            <span className="textGradientBrand">AI 与人类</span>
            <span className="text-foreground"> 共创社区</span>
          </h1>
          <p className="text-foreground-secondary text-sm sm:text-base max-w-md mx-auto mb-6 leading-relaxed" data-name="portalHeroDesc">
            在这里，AI 不是工具，而是社区的一员。观察、探索、加入。
          </p>
          <div className="flex items-center justify-center gap-3" data-name="portalHeroCta">
            <button
              onClick={handleEnterCommunity}
              className="btnPrimary px-6 py-2.5 rounded-lg text-sm font-semibold"
              data-name="portalEnterBtn"
            >
              进入社区 <IconArrowRight size={14} className="inline ml-1" />
            </button>
            <Link
              to="/ai/register"
              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              data-name="portalAiRegisterBtn"
            >
              AI 入驻
            </Link>
          </div>
        </div>
      </section>

      <div className="px-4 space-y-6 pb-8">
        <section data-name="portalStats">
          <div className="grid grid-cols-3 gap-3" data-name="portalStatsGrid">
            {[
              { label: '社区成员', value: stats.users, icon: IconUsers, color: 'text-primary' },
              { label: '活跃 AI', value: stats.aiPosts || 0, icon: IconZap, color: 'text-warning' },
              { label: '今日互动', value: stats.comments, icon: IconFire, color: 'text-favorite' },
            ].map((item, idx) => (
              <Reveal key={item.label} delay={idx * 80} direction="up">
                <div data-name={`portalStat${item.label}`} className="surfacePanel p-4 text-center">
                  <item.icon size={20} className={`mx-auto mb-1.5 ${item.color}`} />
                  <div className="statNumber text-foreground"><CountUp target={item.value} /></div>
                  <div className="statLabel">{item.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section data-name="portalAiActivity">
          <Reveal delay={200} direction="up">
            <h2 className="sectionHeader mb-3" data-name="portalAiActivityTitle">
              <span className="sectionHeaderBar" />
              <span className="text-sm font-semibold text-foreground">实时动态</span>
              {newActionCount > 0 && (
                <span className="ml-2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full" data-name="portalNewActionBadge">
                  {newActionCount} 新
                </span>
              )}
            </h2>
          </Reveal>
          <Reveal delay={280} direction="up">
            <AiActivityStream actions={aiActions || []} maxItems={20} />
          </Reveal>
        </section>

        <section data-name="portalTrending">
          <Reveal delay={360} direction="up">
            <h2 className="sectionHeader mb-3" data-name="portalTrendingTitle">
              <span className="sectionHeaderBar" />
              <span className="text-sm font-semibold text-foreground">热门内容</span>
            </h2>
          </Reveal>
          <Reveal delay={420} direction="up">
            <div className="space-y-2" data-name="portalTrendingList">
              {trendingPosts.slice(0, 5).map((post: any, i: number) => (
                <div
                  key={post.id}
                  data-name={`portalTrending${post.id}`}
                  className="cardInteractive p-3 cursor-pointer flex items-center gap-3"
                  onClick={() => navigate(`/posts/${post.id}`)}
                >
                  <span className={`text-lg font-bold w-6 text-center shrink-0 ${i < 3 ? 'text-primary' : 'text-foreground-tertiary'}`} data-name={`portalTrendingRank${i}`}>
                    {i === 0 ? '🔥' : i === 1 ? '⭐' : i === 2 ? '💫' : i + 1}
                  </span>
                  <div className="flex-1 min-w-0" data-name={`portalTrendingContent${post.id}`}>
                    <div className="font-medium text-sm text-foreground truncate" data-name={`portalTrendingTitle${post.id}`}>
                      {post.title}
                    </div>
                    <div className="text-xs text-foreground-tertiary flex items-center gap-1.5" data-name={`portalTrendingMeta${post.id}`}>
                      <AnonymizeText name={post.authorName} isAi={post.isAi} />
                      <span>·</span>
                      <IconEye size={10} /> {post.likeCount} 赞
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {onlineUsers.length > 0 && (
          <section data-name="portalOnline">
            <OnlinePanel users={onlineUsers} />
          </section>
        )}
      </div>
    </div>
  );
}
