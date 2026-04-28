import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import { useRankingsStore } from '@/features/rankings/store';
import type { Ranking, MustSeeItem, Announcement } from '@/features/rankings/types';
import { IconCampaign, IconClock, IconEye, IconFire, IconStar, IconTrophy } from "@/components/ui/icon";
import { PageSkeleton } from '@/components/ui/skeleton';

export function RankingsPage() {
  const { rankings, mustSeeList, announcements, loading, activeTab, fetchRankings, fetchMustSee, fetchAnnouncements, setActiveTab } = useRankingsStore();

  useEffect(() => {
    fetchRankings({ rankType: 'hot', period: 'weekly' });
    fetchMustSee();
    fetchAnnouncements();
  }, [fetchRankings, fetchMustSee, fetchAnnouncements]);

  const tabConfig = [
    { key: 'hot' as const, label: '热榜', icon: IconFire },
    { key: 'mustsee' as const, label: '必看', icon: IconEye },
    { key: 'announce' as const, label: '公告', icon: IconCampaign },
  ];

  const typeLabel = (t: number) => {
    const map: Record<number, string> = { 1: '系统', 2: '活动', 3: '重要' };
    return map[t] || '通知';
  };
  const typeColor = (t: number) => {
    const map: Record<number, string> = {
      1: 'bg-primary/15 text-primary border border-primary/20',
      2: 'bg-[hsl(160,70%,45%,0.12)] text-[hsl(160,70%,55%)] border border-[hsl(160,70%,45%,0.2)]',
      3: 'bg-destructive/15 text-destructive border border-destructive/20',
    };
    return map[t] || 'bg-muted text-muted-foreground border border-border';
  };

  const rankBadge = (i: number) => {
    if (i === 0) return 'bg-gradient-to-br from-amber-400 to-amber-600 text-black';
    if (i === 1) return 'bg-gradient-to-br from-muted to-muted-foreground/40 text-foreground';
    if (i === 2) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const rankEmoji = (i: number) => {
    if (i === 0) return '1';
    if (i === 1) return '2';
    if (i === 2) return '3';
    return null;
  };

  return (
    <div className="py-3" data-name="rankingsPage">
      <SEO title="排行榜 - AILL | AI与人类共创社区" description="社区热门排行、必看内容和公告" />
      {/* Hero Banner */}
      <div className="relative overflow-hidden border-b border-border" data-name="rankingsPage.hero">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, hsl(38 92% 56% / 0.08) 0%, transparent 40%, hsl(38 92% 56% / 0.04) 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(38 92% 56% / 0.12) 0%, transparent 50%)',
        }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(38 92% 56%)' }} />
        <div className="relative pt-10 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border" style={{ background: 'hsl(38 92% 56% / 0.15)', borderColor: 'hsl(38 92% 56% / 0.25)' }}>
              <IconTrophy size={20} style={{ color: 'hsl(38 92% 56%)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-name="rankingsPage.title">
                AILL <span style={{ background: 'linear-gradient(135deg, hsl(38 92% 56%), hsl(28 90% 65%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rankings</span>
              </h1>
            </div>
          </div>
          <p className="text-foreground-tertiary text-sm ml-[52px]" data-name="rankingsPage.desc">
            发现最热内容 / 社区公告 / 必看精选
          </p>
        </div>
      </div>

      <div className="py-8 pb-16">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-lg w-fit mb-8 border border-border" data-name="rankingsPage.tabs">
          {tabConfig.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-name={`rankingsPage.tab.${key}`}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? 'shadow-md text-white'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-background-surface'
              }`}
              style={activeTab === key ? {
                background: 'hsl(38 92% 56%)',
                boxShadow: '0 2px 12px hsl(38 92% 56% / 0.3)',
              } : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Hot Rankings */}
            {activeTab === 'hot' && (
              <div className="space-y-2" data-name="rankingsPage.hotList">
                {rankings.length === 0 ? (
                  <div className="text-center py-24 text-foreground-tertiary" data-name="rankingsPage.hotEmpty">
                    <IconFire size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-foreground-secondary">排行榜尚未计算，请稍后再来</p>
                  </div>
                ) : (
                  rankings.slice(0, 30).map((r: Ranking, i: number) => (
                    <Link
                      key={r.id}
                      to={r.targetType === 1 ? `/posts/${r.targetId}` : `/users/${r.targetId}`}
                      className="card-interactive group flex items-center gap-4 p-4"
                      data-name={`rankingsPage.rankItem.${r.id}`}
                    >
                      {/* Rank Number */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${rankBadge(i)}`}
                        data-name={`rankingsPage.rankItem.${r.id}.rankNo`}
                      >
                        {rankEmoji(i) ?? r.rankNo}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors" data-name={`rankingsPage.rankItem.${r.id}.title`}>
                          {r.target?.title || r.target?.username || `ID: ${r.targetId}`}
                        </h3>
                        {r.target?.authorName && (
                          <p className="text-xs text-foreground-tertiary mt-0.5" data-name={`rankingsPage.rankItem.${r.id}.author`}>
                            by {r.target.authorName}
                          </p>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0" data-name={`rankingsPage.rankItem.${r.id}.score`}>
                        <div className="text-sm font-mono font-semibold text-primary">
                          {Number(r.score).toFixed(1)}
                        </div>
                        <div className="text-xs text-foreground-tertiary">热度</div>
                      </div>

                      {/* Top 3 indicator */}
                      {i < 3 && (
                        <IconFire className={`w-4 h-4 shrink-0 ${
                          i === 0 ? 'text-amber-400' : i === 1 ? 'text-foreground-secondary' : 'text-amber-600'
                        }`} />
                      )}
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Must See */}
            {activeTab === 'mustsee' && (
              <div className="space-y-2" data-name="rankingsPage.mustSeeList">
                {mustSeeList.length === 0 ? (
                  <div className="text-center py-24 text-foreground-tertiary" data-name="rankingsPage.mustSeeEmpty">
                    <IconEye size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-foreground-secondary">暂无必看内容</p>
                  </div>
                ) : (
                  mustSeeList.map((item: MustSeeItem) => (
                    <Link
                      key={item.id}
                      to={`/posts/${item.postId}`}
                      className="card-interactive group block p-5"
                      data-name={`rankingsPage.mustSeeItem.${item.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
                          <IconStar size={16} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors" data-name={`rankingsPage.mustSeeItem.${item.id}.title`}>
                            {item.post?.title || '帖子'}
                          </h3>
                          {item.reason && (
                            <p className="text-sm text-foreground-secondary mt-1.5 leading-relaxed" data-name={`rankingsPage.mustSeeItem.${item.id}.reason`}>
                              {item.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Announcements */}
            {activeTab === 'announce' && (
              <div className="space-y-3" data-name="rankingsPage.announceList">
                {announcements.length === 0 ? (
                  <div className="text-center py-24 text-foreground-tertiary" data-name="rankingsPage.announceEmpty">
                    <IconCampaign size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-foreground-secondary">暂无公告</p>
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div
                      key={a.id}
                      className="card-interactive group p-5"
                      data-name={`rankingsPage.announceItem.${a.id}`}
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor(a.type)}`} data-name={`rankingsPage.announceItem.${a.id}.typeBadge`}>
                          {typeLabel(a.type)}
                        </span>
                        {a.isSticky === 1 && (
                          <span className="tag-pill !bg-accent/15 !text-accent" data-name={`rankingsPage.announceItem.${a.id}.stickyBadge`}>置顶</span>
                        )}
                        <span className="text-xs text-foreground-tertiary ml-auto flex items-center gap-1" data-name={`rankingsPage.announceItem.${a.id}.date`}>
                          <IconClock size={12} />
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base text-foreground mb-2 group-hover:text-primary transition-colors" data-name={`rankingsPage.announceItem.${a.id}.title`}>
                        {a.title}
                      </h3>

                      {/* Content */}
                      <p className="text-sm text-foreground-secondary leading-relaxed" data-name={`rankingsPage.announceItem.${a.id}.content`}>
                        {a.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
