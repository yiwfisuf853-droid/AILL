import { Link } from 'react-router-dom';
import { IconEye, IconHeart, IconComment, IconFire, IconPlay } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import { normalizeLiveRoomStatus } from '../types';

interface LiveCardProps {
  room: any;
}

const statusConfig: Record<'pending' | 'live' | 'ended', { label: string; color: string; dot: string }> = {
  pending: { label: '预告', color: 'bg-info/20 text-info', dot: 'bg-info' },
  live: { label: '直播中', color: 'bg-destructive/20 text-destructive', dot: 'bg-destructive animate-pulse' },
  ended: { label: '已结束', color: 'bg-muted text-foreground-tertiary', dot: 'bg-foreground-tertiary' },
};

export function LiveCard({ room }: LiveCardProps) {
  const status = normalizeLiveRoomStatus(room.status);
  const sc = statusConfig[status];
  const isLive = status === 'live';

  return (
    <Link
      to={`/live/${room.id}`}
      data-name={`liveCard${room.id}`}
      className="group relative rounded-xl bg-card border border-border/60 hover:border-destructive/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-destructive/5"
    >
      <div data-name={`liveCard${room.id}Cover`} className="aspect-video bg-gradient-to-br from-muted to-background relative overflow-hidden">
        <div data-name={`liveCard${room.id}CoverCenter`} className="absolute inset-0 flex items-center justify-center">
          {isLive ? (
            <div data-name={`liveCard${room.id}LiveIcon`} className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center backdrop-blur-sm border border-destructive/30">
              <IconFire size={32} className="text-destructive" />
            </div>
          ) : (
            <IconPlay size={64} className="text-foreground-tertiary/30 group-hover:text-destructive/40 transition-colors" />
          )}
        </div>
        <div data-name={`liveCard${room.id}StatusBadge`} className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`} data-name={`liveCard${room.id}Status`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>
        <div data-name={`liveCard${room.id}ViewCount`} className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-background/70 text-xs backdrop-blur-sm text-foreground-secondary">
            <IconEye size={12} /> {room.viewCount}
          </span>
        </div>
      </div>

      <div className="p-4" data-name={`liveCard${room.id}Info`}>
        <h3 className="font-semibold mb-2 text-foreground group-hover:text-destructive transition-colors line-clamp-1" data-name={`liveCard${room.id}Title`}>{room.title}</h3>
        <div data-name={`liveCard${room.id}Streamer`} className="flex items-center gap-2 text-sm text-foreground-secondary">
          <div className="relative">
            <Avatar size="xs" src={room.streamer?.avatar} fallback={room.streamer?.username || '主播'} isAi={room.streamer?.isAi} />
            {room.streamer?.isAi && <LivenessIndicator active size="sm" className="absolute -bottom-0.5 -right-0.5" />}
          </div>
          <span data-name={`liveCard${room.id}StreamerName`}>{room.streamer?.username || '主播'}</span>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-foreground-tertiary" data-name={`liveCard${room.id}Stats`}>
          <span className="flex items-center gap-1"><IconHeart size={12} /> {room.likeCount}</span>
          <span className="flex items-center gap-1"><IconComment size={12} /> {room.commentCount}</span>
        </div>
      </div>
    </Link>
  );
}
