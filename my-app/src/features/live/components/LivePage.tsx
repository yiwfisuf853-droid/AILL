import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveStore } from '@/features/live/store';
import { IconComment, IconEye, IconFire, IconHeart, IconLive, IconPlay, IconStar, IconArrowLeft } from "@/components/ui/Icon";
import { CardSkeletonGrid } from '@/components/ui/Skeleton';

export function LivePage() {
  const { rooms, gifts, loading, filter, setFilter, fetchData } = useLiveStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData(filter);
  }, [filter]);

  const statusConfig: Record<number, { label: string; color: string; dot: string }> = {
    1: { label: '预告', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
    2: { label: '直播中', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-400 animate-pulse' },
    3: { label: '已结束', color: 'bg-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
    4: { label: '回放', color: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  };

  const filters = [
    { value: null, label: '全部' },
    { value: 2, label: '直播中' },
    { value: 1, label: '预告' },
    { value: 3, label: '已结束' },
  ];

  return (
    <div className="py-4" data-name="live">
      {/* Hero with live glow effect */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/60 mb-6" data-name="liveHero">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/5 rounded-full blur-[100px]" />
        <div data-name="liveHeroContent" className="relative px-5 pt-8 pb-6">
          <div data-name="liveHeroTitleRow" className="flex items-center gap-3 mb-2">
            <IconLive size={28} className="text-red-500" />
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }} data-name="liveTitle">
              AILL <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">Live</span>
            </h1>
          </div>
          <p className="text-foreground-tertiary text-sm ml-10" data-name="liveDesc">实时直播 / 互动打赏 / 精彩回放</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6" data-name="liveFilters">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            data-name={`liveFilter${f.label}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                : 'bg-card border border-border/60 text-foreground-secondary hover:text-foreground hover:border-border'
            }`}
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
        /* Room Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-name="liveRoomGrid">
          {rooms.map((room) => {
            const sc = statusConfig[room.status] || statusConfig[1];
            return (
              <Link
                key={room.id}
                to={`/live/${room.id}`}
                data-name={`liveRoom${room.id}`}
                className="group relative rounded-xl bg-card border border-border/60 hover:border-red-500/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-red-500/5"
              >
                {/* Cover */}
                <div data-name={`liveRoom${room.id}Cover`} className="aspect-video bg-gradient-to-br from-muted to-background relative overflow-hidden">
                  <div data-name={`liveRoom${room.id}CoverCenter`} className="absolute inset-0 flex items-center justify-center">
                    {room.status === 2 ? (
                      <div data-name={`liveRoom${room.id}LiveIcon`} className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-sm border border-red-500/30">
                        <IconFire size={32} className="text-red-400" />
                      </div>
                    ) : (
                      <IconPlay size={64} className="text-foreground-tertiary/30 group-hover:text-red-500/40 transition-colors" />
                    )}
                  </div>
                  {/* Status badge */}
                  <div data-name={`liveRoom${room.id}StatusBadgeWrap`} className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`} data-name={`liveRoom${room.id}StatusBadge`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>
                  {/* Stats overlay */}
                  <div data-name={`liveRoom${room.id}StatsOverlay`} className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-background/70 text-xs backdrop-blur-sm text-foreground-secondary" data-name={`liveRoom${room.id}ViewCount`}>
                      <IconEye size={12} /> {room.viewCount}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4" data-name={`liveRoom${room.id}Info`}>
                  <h3 className="font-semibold mb-2 text-foreground group-hover:text-red-500 transition-colors line-clamp-1" data-name={`liveRoom${room.id}Title`}>{room.title}</h3>
                  <div data-name={`liveRoom${room.id}StreamerRow`} className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <div data-name={`liveRoom${room.id}StreamerAvatar`} className="w-6 h-6 rounded-full bg-muted" />
                    <span data-name={`liveRoom${room.id}Streamer`}>{room.streamer?.username || '主播'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground-tertiary" data-name={`liveRoom${room.id}Stats`}>
                    <span className="flex items-center gap-1" data-name={`liveRoom${room.id}LikeCount`}><IconHeart size={12} /> {room.likeCount}</span>
                    <span className="flex items-center gap-1" data-name={`liveRoom${room.id}CommentCount`}><IconComment size={12} /> {room.commentCount}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Gifts section */}
      {gifts.length > 0 && (
        <div className="mt-12" data-name="liveGifts">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-foreground" data-name="liveGiftsTitle">
            <IconStar size={18} className="text-pink-500" />
            礼物列表
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" data-name="liveGiftGrid">
            {gifts.map((g) => (
              <div
                key={g.id}
                data-name={`liveGift${g.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/60 hover:border-pink-500/30 transition-all"
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
