import { useEffect } from 'react';
import { useCampaignsStore } from '@/features/campaigns/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { IconCampaign, IconCheck, IconClock, IconFire, IconStar, IconTrophy } from "@/components/ui/icon";
import { PageSkeleton } from '@/components/ui/skeleton';

export function CampaignsPage() {
  const user = useAuthStore(s => s.user);
  const { campaigns, achievements, progress, loading, activeTab, fetchData, fetchProgress, setActiveTab, joinCampaign } = useCampaignsStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (user) fetchProgress(user.id);
  }, [user, fetchProgress]);

  async function handleJoin(id: string) {
    if (!user) { toast('请先登录'); return; }
    try {
      await joinCampaign(id, user.id);
      toast.success('参与成功！');
      fetchData();
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '参与失败');
    }
  }

  return (
    <div className="py-3" data-name="campaignsPage">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border" data-name="campaignsPage.hero">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(28 90% 56% / 0.1) 0%, transparent 40%, hsl(340 75% 55% / 0.05) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(28 90% 56%)' }} />
        <div className="relative pt-10 pb-6">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border" style={{ background: 'hsl(28 90% 56% / 0.15)', borderColor: 'hsl(28 90% 56% / 0.25)' }}>
              <IconCampaign size={20} style={{ color: 'hsl(28 90% 56%)' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" data-name="campaignsPage.title">
              AILL <span className="text-gradient-hot">Quests</span>
            </h1>
          </div>
          <p className="text-foreground-secondary text-sm ml-[52px]" data-name="campaignsPage.desc">完成任务 / 解锁成就 / 获取奖励</p>
        </div>
      </div>

      <div className="py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6" data-name="campaignsPage.tabs">
          <button
            onClick={() => setActiveTab('campaigns')}
            data-name="campaignsPage.campaignsTab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'campaigns'
                ? 'text-white shadow-md'
                : 'text-foreground-tertiary hover:text-foreground-secondary'
            }`}
            style={activeTab === 'campaigns' ? {
              background: 'hsl(28 90% 56%)',
              boxShadow: '0 2px 12px hsl(28 90% 56% / 0.3)',
            } : undefined}
          >
            <IconCampaign size={16} />
            任务
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            data-name="campaignsPage.achievementsTab"
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'achievements'
                ? 'text-white shadow-md'
                : 'text-foreground-tertiary hover:text-foreground-secondary'
            }`}
            style={activeTab === 'achievements' ? {
              background: 'hsl(28 90% 56%)',
              boxShadow: '0 2px 12px hsl(28 90% 56% / 0.3)',
            } : undefined}
          >
            <IconTrophy size={16} />
            成就
          </button>
        </div>

        {loading ? (
          <PageSkeleton data-name="campaignsPage.loading" />
        ) : activeTab === 'campaigns' ? (
          /* Campaigns */
          <div className="space-y-4" data-name="campaignsPage.campaignList">
            {campaigns.length === 0 ? (
              <div className="text-center py-20 text-foreground-tertiary" data-name="campaignsPage.campaignEmpty">
                <IconCampaign size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">暂无活动</p>
              </div>
            ) : (
              campaigns.map((c) => {
                const now = new Date().getTime();
                const start = new Date(c.startTime).getTime();
                const end = new Date(c.endTime).getTime();
                const isActive = now >= start && now <= end;
                const rewards = c.rewardConfig?.rewards || [];

                return (
                  <div
                    key={c.id}
                    className="card-interactive p-5 group reveal-item"
                    data-name={`campaignsPage.campaign.${c.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        c.type === 1 ? 'bg-accent/15' : 'bg-chart-5/15'
                      }`} data-name={`campaignsPage.campaign.${c.id}.icon`}>
                        {c.type === 1
                          ? <IconFire size={24} className="text-accent" />
                          : <IconFire size={24} className="text-chart-5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors" data-name={`campaignsPage.campaign.${c.id}.name`}>{c.name}</h3>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-chart-2/15 text-chart-2" data-name={`campaignsPage.campaign.${c.id}.activeBadge`}>
                              <span className="pulse-dot" style={{ transform: 'scale(0.6)' }} />
                              进行中
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground-tertiary" data-name={`campaignsPage.campaign.${c.id}.endedBadge`}>
                              已结束
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground-secondary mb-3" data-name={`campaignsPage.campaign.${c.id}.desc`}>{c.description}</p>

                        {/* Progress bar */}
                        <div className="mb-3" data-name={`campaignsPage.campaign.${c.id}.progress`}>
                          <div className="flex items-center justify-between text-xs text-foreground-tertiary mb-1.5">
                            <span data-name={`campaignsPage.campaign.${c.id}.progressCount`}>{(() => {
                              const p = progress[c.id];
                              const current = p?.currentCount || 0;
                              const target = c.rewardConfig?.target || 1;
                              return `${current} / ${target}`;
                            })()}</span>
                            <span className="flex items-center gap-1" data-name={`campaignsPage.campaign.${c.id}.deadline`}>
                              <IconClock size={12} />
                              {new Date(c.endTime).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              data-name={`campaignsPage.campaign.${c.id}.progressBar`}
                              style={{
                                width: `${(() => {
                                  const p = progress[c.id];
                                  const current = p?.currentCount || 0;
                                  const target = c.rewardConfig?.target || 1;
                                  return Math.min(100, Math.round((current / target) * 100));
                                })()}%`,
                                background: 'var(--gradient-hot)',
                              }}
                            />
                          </div>
                        </div>

                        {/* Rewards */}
                        {rewards.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap" data-name={`campaignsPage.campaign.${c.id}.rewards`}>
                            <IconStar size={14} className="text-accent" />
                            {rewards.map((r: { amount: number; assetTypeId: number }, i: number) => (
                              <span key={i} className="tag-pill" data-name={`campaignsPage.campaign.${c.id}.reward.${i}`} style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))' }}>
                                +{r.amount} {r.assetTypeId === 1 ? '积分' : r.assetTypeId === 2 ? '硬币' : '钻石'}
                              </span>
                            ))}
                          </div>
                        )}

                        {isActive && (
                          <button
                            onClick={() => handleJoin(c.id)}
                            data-name={`campaignsPage.campaign.${c.id}.joinBtn`}
                            className="mt-3 px-4 py-1.5 rounded-md text-xs font-medium transition-all
                              bg-accent text-accent-foreground hover:opacity-90"
                          >
                            参与任务
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Achievements */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-name="campaignsPage.achievementGrid">
            {achievements.length === 0 ? (
              <div className="col-span-full text-center py-20 text-foreground-tertiary" data-name="campaignsPage.achievementEmpty">
                <IconTrophy size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">暂无成就</p>
              </div>
            ) : (
              achievements.map((a) => (
                <div
                  key={a.id}
                  className="card-interactive p-5 text-center group reveal-item"
                  data-name={`campaignsPage.achievement.${a.id}`}
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/10 transition-colors" data-name={`campaignsPage.achievement.${a.id}.icon`}>
                    <span className="text-3xl leading-none">{a.icon}</span>
                  </div>
                  <h3 className="font-semibold mb-1 text-foreground group-hover:text-accent transition-colors" data-name={`campaignsPage.achievement.${a.id}.name`}>{a.name}</h3>
                  <p className="text-xs text-foreground-tertiary mb-3" data-name={`campaignsPage.achievement.${a.id}.condition`}>{a.condition?.description || '完成特定目标'}</p>
                  {a.reward?.rewards && a.reward.rewards.length > 0 && (
                    <div className="flex items-center gap-1 justify-center flex-wrap" data-name={`campaignsPage.achievement.${a.id}.rewards`}>
                      {a.reward.rewards!.map((r: { amount: number; assetTypeId: number }, i: number) => (
                        <span key={i} className="tag-pill" data-name={`campaignsPage.achievement.${a.id}.reward.${i}`} style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))' }}>
                          +{r.amount}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
