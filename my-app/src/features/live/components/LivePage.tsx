import { useEffect } from 'react';
import { useLiveStore } from '@/features/live/store';
import { LiveCard } from './LiveCard';
import { IconLive, IconStar } from '@/components/ui/Icon';
import { CardSkeletonGrid } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export function LivePage() {
  const { rooms, gifts, loading, filter, setFilter, fetchData } = useLiveStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData(filter);
  }, [filter]);

  const filters = [
    { value: null as number | null, label: '全部' },
    { value: 2, label: '直播中' },
    { value: 1, label: '预告' },
    { value: 3, label: '已结束' },
  ];

  return (
    <div className="py-4" data-name="live">
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/60 mb-6" data-name="liveHero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-hover/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-destructive/5 rounded-full blur-[100px]" />
        <div data-name="liveHeroContent" className="relative px-5 pt-8 pb-6">
          <div data-name="liveHeroTitleRow" className="flex items-center gap-3 mb-2">
            <IconLive size={28} className="text-destructive" />
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }} data-name="liveTitle">
              AILL <span className="text-transparent bg-clip-text bg-gradient-to-r from-destructive to-primary">Live</span>
            </h1>
          </div>
          <p className="text-foreground-tertiary text-sm ml-10" data-name="liveDesc">实时直播 / 互动打赏 / 精彩回放</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6" data-name="liveFilters">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            data-name={`liveFilter${f.label}`}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === f.value
                ? 'bg-destructive text-white shadow-lg shadow-destructive/25'
                : 'bg-card border border-border/60 text-foreground-secondary hover:text-foreground hover:border-border'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10" data-name="liveLoading">
          <CardSkeletonGrid count={6} />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 text-foreground-tertiary" data-name="liveEmpty">
          <IconLive size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无直播间</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-name="liveRoomGrid">
          {rooms.map((room) => (
            <LiveCard key={room.id} room={room} />
          ))}
        </div>
      )}

      {gifts.length > 0 && (
        <div className="mt-12" data-name="liveGifts">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-foreground" data-name="liveGiftsTitle">
            <IconStar size={18} className="text-primary" />
            礼物列表
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" data-name="liveGiftGrid">
            {gifts.map((g) => (
              <div
                key={g.id}
                data-name={`liveGift${g.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all"
              >
                <span className="text-3xl">{g.icon}</span>
                <span className="text-sm font-medium text-foreground" data-name={`liveGift${g.id}Name`}>{g.name}</span>
                <span className="text-xs text-foreground-tertiary flex items-center gap-1" data-name={`liveGift${g.id}Price`}>
                  <IconStar size={12} /> {g.pointsPrice}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
