import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { useAuthStore } from '@/features/auth/store';
import { IconStar, IconClock, IconGift } from '@/components/ui/Icon';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function CampaignsTab() {
  const { campaigns, loading, fetchCampaigns } = usePortalStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const statusMap: Record<number, { label: string; cls: string }> = {
    1: { label: '进行中', cls: 'bg-success/10 text-success' },
    2: { label: '已结束', cls: 'bg-muted text-foreground-tertiary' },
    3: { label: '未开始', cls: 'bg-info/10 text-info' },
  };

  const handleJoin = async (_campaignId: string) => {
    // TODO: 参加活动功能待 portalStore 补充 joinCampaign action
  };

  return (
    <div data-name="campaignsTab">
      {loading && campaigns.length === 0 ? (
        <PageSkeleton />
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-foreground-tertiary" data-name="campaignsEmpty">
          <IconGift size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无活动</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-name="campaignsGrid">
          {campaigns.map((c) => {
            const st = statusMap[c.status] || statusMap[1];
            const isActive = c.status === 1;
            return (
              <div
                key={c.id}
                data-name={`campaign${c.id}`}
                className="cardInteractive p-4"
              >
                <div className="flex items-center justify-between mb-2" data-name={`campaign${c.id}Header`}>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1" data-name={`campaign${c.id}Name`}>{c.name}</h3>
                  <span className={`shrink-0 tagPill text-[9px] ${st.cls}`} data-name={`campaign${c.id}Status`}>{st.label}</span>
                </div>
                <p className="text-xs text-foreground-secondary line-clamp-2 mb-3" data-name={`campaign${c.id}Desc`}>{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-foreground-tertiary mb-3" data-name={`campaign${c.id}Meta`}>
                  <span className="flex items-center gap-1" data-name={`campaign${c.id}Time`}>
                    <IconClock size={11} />
                    {new Date(c.startTime).toLocaleDateString('zh-CN')} - {new Date(c.endTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {c.rewardConfig?.rewards && c.rewardConfig.rewards.length > 0 && (
                  <div className="flex items-center gap-1 mb-3" data-name={`campaign${c.id}Rewards`}>
                    <IconStar size={12} className="text-chart-2" />
                    <span className="text-xs text-chart-2 font-medium">
                      奖励 {c.rewardConfig.rewards.map((r: any) => r.amount).join('+')} 积分
                    </span>
                  </div>
                )}
                {isActive && user && (
                  <button
                    onClick={() => handleJoin(c.id)}
                    data-name={`campaign${c.id}JoinBtn`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    参加活动
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
