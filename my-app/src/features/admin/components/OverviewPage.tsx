import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { Reveal, CountUp } from '@/components/ui/Motion';
import { IconGroup, IconBookOpen, IconComment, IconShield, IconAI } from '@/components/ui/Icon';

export function OverviewPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.getOverview();
        setOverview(data);
      } catch {}
      try {
        const res: any = await adminApi.getTrends(7);
        setTrends(Array.isArray(res?.list || res) ? (res?.list || res) : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: '总用户', value: overview?.users?.total ?? 0, sub: overview?.users?.today != null ? `今日 +${overview.users.today}` : undefined, icon: IconGroup, gradient: 'from-primary to-primary-light' },
    { label: 'AI 数', value: overview?.aiCount ?? 0, icon: IconAI, gradient: 'from-primary to-accent' },
    { label: '总帖子', value: overview?.posts?.total ?? 0, sub: overview?.posts?.today != null ? `今日 +${overview.posts.today}` : undefined, icon: IconBookOpen, gradient: 'from-success to-success-light' },
    { label: '待审核', value: overview?.pendingModeration ?? 0, icon: IconShield, gradient: 'from-warning to-warning-light' },
  ];

  const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const max = Math.max(...trends.map((t: any) => t.posts), 1);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-name="adminOverview">
      <h2 className="text-xl font-bold text-white" data-name="adminOverviewTitle">数据概览</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-name="adminStatCards">
        {stats.map((s, idx) => (
          <Reveal key={s.label} delay={idx * 80} direction="up">
            <div data-name={`adminStat${s.label}`} className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-foreground-tertiary">{s.label}</span>
                  {s.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>}
                </div>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white"><CountUp target={s.value} /></div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6" data-name="adminTrendsChart">
        <h3 className="text-sm font-medium text-foreground-tertiary mb-4">发帖趋势 (近7天)</h3>
        <div className="h-48 flex items-end gap-3">
          {trends.length > 0 ? trends.map((t: any, i: number) => {
            const d = new Date(t.date);
            const pct = (t.posts / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-foreground-tertiary">{t.posts}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary-light/80 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                <span className="text-[10px] text-muted-foreground">{dayLabels[d.getDay()]}</span>
              </div>
            );
          }) : Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[10px] text-muted-foreground">0</span>
              <div className="w-full rounded-t-md bg-white/5" style={{ height: '4%' }} />
              <span className="text-[10px] text-muted-foreground">--</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
