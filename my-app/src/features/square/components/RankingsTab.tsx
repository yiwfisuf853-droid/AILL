import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { IconFire, IconEye, IconMegaphone } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type RankingSubTab = 'hot' | 'mustsee' | 'announce';

export function RankingsTab() {
  const { rankings, mustSeeList, announcements, loading, fetchRankings, fetchMustSee, fetchAnnouncements } = usePortalStore();
  const [subTab, setSubTab] = useState<RankingSubTab>('hot');

  useEffect(() => {
    if (subTab === 'hot' && rankings.length === 0) fetchRankings();
    if (subTab === 'mustsee' && mustSeeList.length === 0) fetchMustSee();
    if (subTab === 'announce' && announcements.length === 0) fetchAnnouncements();
  }, [subTab]);

  const subTabs: { key: RankingSubTab; label: string; icon: any }[] = [
    { key: 'hot', label: '热榜', icon: IconFire },
    { key: 'mustsee', label: '必看', icon: IconEye },
    { key: 'announce', label: '公告', icon: IconMegaphone },
  ];

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-warning to-warning/70 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-foreground-tertiary to-foreground-tertiary/70 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-chart-4 to-chart-4/70 text-white';
    return 'bg-muted text-foreground-tertiary';
  };

  return (
    <div data-name="rankingsTab">
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit mb-5" data-name="rankingsSubTabs">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            data-name={`rankingsSubTab${t.key}`}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              subTab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground'
            )}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-foreground-tertiary text-sm" data-name="rankingsLoading">加载中...</div>
      ) : subTab === 'hot' ? (
        <div className="space-y-2" data-name="rankingsHotList">
          {rankings.length === 0 ? (
            <div className="text-center py-12 text-foreground-tertiary text-sm">暂无排行数据</div>
          ) : (
            rankings.map((r, i) => (
              <Link
                key={r.id}
                to={r.targetId ? `/posts/${r.targetId}` : '#'}
                data-name={`rankingItem${r.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
              >
                <span
                  data-name={`rankingItem${r.id}Rank`}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    rankStyle(r.rankNo || i + 1)
                  )}
                >
                  {r.rankNo || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate" data-name={`rankingItem${r.id}Title`}>
                    {r.target?.title || `#${r.targetId}`}
                  </h4>
                  <span className="text-xs text-foreground-tertiary" data-name={`rankingItem${r.id}Author`}>
                    {r.target?.username || r.target?.authorName || ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary shrink-0" data-name={`rankingItem${r.id}Score`}>
                  <IconFire size={12} /> {r.score?.toFixed(1) || 0}
                </div>
              </Link>
            ))
          )}
        </div>
      ) : subTab === 'mustsee' ? (
        <div className="space-y-2" data-name="rankingsMustSeeList">
          {mustSeeList.length === 0 ? (
            <div className="text-center py-12 text-foreground-tertiary text-sm">暂无必看内容</div>
          ) : (
            mustSeeList.map((item) => (
              <Link
                key={item.id}
                to={item.postId ? `/posts/${item.postId}` : '#'}
                data-name={`mustSeeItem${item.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
              >
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0" data-name={`mustSeeItem${item.id}Icon`}>
                  <IconEye size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate" data-name={`mustSeeItem${item.id}Title`}>
                    {item.post?.title || `帖子 #${item.postId}`}
                  </h4>
                  {item.reason && (
                    <p className="text-xs text-foreground-tertiary truncate mt-0.5" data-name={`mustSeeItem${item.id}Reason`}>{item.reason}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2" data-name="rankingsAnnounceList">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-foreground-tertiary text-sm">暂无公告</div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                data-name={`announcement${a.id}`}
                className="p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-center gap-2 mb-2" data-name={`announcement${a.id}Header`}>
                  <IconMegaphone size={14} className="text-primary shrink-0" />
                  <h4 className="text-sm font-medium text-foreground" data-name={`announcement${a.id}Title`}>{a.title}</h4>
                  {a.isSticky === 1 && (
                    <span className="tagPill text-[9px] bg-warning/10 text-warning" data-name={`announcement${a.id}Sticky`}>置顶</span>
                  )}
                </div>
                <p className="text-xs text-foreground-secondary leading-relaxed" data-name={`announcement${a.id}Content`}>{a.content}</p>
                <span className="text-[10px] text-foreground-tertiary mt-2 block" data-name={`announcement${a.id}Date`}>
                  {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
