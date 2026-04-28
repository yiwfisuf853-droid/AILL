import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveStore } from '@/features/live/store';
import { IconComment, IconEye, IconFire, IconHeart, IconLive, IconPlay, IconStar, IconArrowLeft } from "@/components/ui/icon";
import { CardSkeletonGrid } from '@/components/ui/skeleton';

export function LivePage() {
  const { rooms, gifts, loading, filter, setFilter, fetchData } = useLiveStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData(filter);
  }, [filter]);

  const statusConfig: Record<number, { label: string; color: string; dot: string }> = {
    1: { label: '预告', color: 'bg-blue-500/20 text-blue-300', dot: 'bg-blue-400' },
    2: { label: '直播中', color: 'bg-red-500/20 text-red-300', dot: 'bg-red-400 animate-pulse' },
    3: { label: '已结束', color: 'bg-zinc-500/20 text-zinc-400', dot: 'bg-zinc-500' },
    4: { label: '回放', color: 'bg-amber-500/20 text-amber-300', dot: 'bg-amber-400' },
  };

  const filters = [
    { value: null, label: '全部' },
    { value: 2, label: '直播中' },
    { value: 1, label: '预告' },
    { value: 3, label: '已结束' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0812] text-white" data-name="livePage">
      {/* Hero with live glow effect */}
      <div className="relative overflow-hidden" data-name="livePage.hero">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-transparent to-purple-950/40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-500/10 rounded-full blur-[100px]" />
        <div className="relative container mx-auto px-4 pt-12 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="返回首页" data-name="livePage.backLink">
              <IconArrowLeft size={18} />
            </Link>
            <IconLive size={32} className="text-red-400" />
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }} data-name="livePage.title">
              AILL <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">Live</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm ml-11" data-name="livePage.desc">实时直播 / 互动打赏 / 精彩回放</p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Filters */}
        <div className="flex gap-2 mb-8" data-name="livePage.filters">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              data-name={`livePage.filter.${f.label}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10" data-name="livePage.loading">
            <CardSkeletonGrid count={6} />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-zinc-500" data-name="livePage.empty">
            <IconLive size={48} className="mx-auto mb-3 opacity-50" />
            <p>暂无直播间</p>
          </div>
        ) : (
          /* Room Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-name="livePage.roomGrid">
            {rooms.map((room) => {
              const sc = statusConfig[room.status] || statusConfig[1];
              return (
                <Link
                  key={room.id}
                  to={`/live/${room.id}`}
                  data-name={`livePage.room.${room.id}`}
                  className="group relative rounded-2xl bg-zinc-900/60 border border-zinc-800/50 hover:border-red-500/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-red-500/5"
                >
                  {/* Cover */}
                  <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden" data-name={`livePage.room.${room.id}.cover`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {room.status === 2 ? (
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-sm border border-red-500/30">
                          <IconFire size={32} className="text-red-400" />
                        </div>
                      ) : (
                        <IconPlay size={64} className="text-zinc-700 group-hover:text-red-600/50 transition-colors" />
                      )}
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`} data-name={`livePage.room.${room.id}.statusBadge`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                    {/* Stats overlay */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 text-xs backdrop-blur-sm" data-name={`livePage.room.${room.id}.viewCount`}>
                        <IconEye size={12} /> {room.viewCount}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4" data-name={`livePage.room.${room.id}.info`}>
                    <h3 className="font-semibold mb-2 group-hover:text-red-300 transition-colors line-clamp-1" data-name={`livePage.room.${room.id}.title`}>{room.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <div className="w-6 h-6 rounded-full bg-zinc-700" />
                      <span data-name={`livePage.room.${room.id}.streamer`}>{room.streamer?.username || '主播'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500" data-name={`livePage.room.${room.id}.stats`}>
                      <span className="flex items-center gap-1" data-name={`livePage.room.${room.id}.likeCount`}><IconHeart size={12} /> {room.likeCount}</span>
                      <span className="flex items-center gap-1" data-name={`livePage.room.${room.id}.commentCount`}><IconComment size={12} /> {room.commentCount}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Gifts section */}
        {gifts.length > 0 && (
          <div className="mt-16" data-name="livePage.gifts">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" data-name="livePage.giftsTitle">
              <IconStar size={20} className="text-pink-400" />
              礼物列表
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" data-name="livePage.giftGrid">
              {gifts.map((g) => (
                <div
                  key={g.id}
                  data-name={`livePage.gift.${g.id}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/30 hover:border-pink-500/20 transition-all"
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span className="text-sm font-medium" data-name={`livePage.gift.${g.id}.name`}>{g.name}</span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1" data-name={`livePage.gift.${g.id}.price`}>
                    <IconStar size={12} /> {g.pointsPrice}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

