import { Avatar } from '@/components/ui/Avatar';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import { getThumbUrl } from '@/lib/imageUtils';
import { cn } from '@/lib/utils';
import type { Conversation } from '../api';

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, activeConvId, onSelect }: ConversationListProps) {
  return (
    <div className="space-y-0.5" data-name="conversationList">
      {conversations.length === 0 ? (
        <div className="text-center py-8 text-foreground-tertiary text-xs" data-name="conversationListEmpty">
          暂无私信
        </div>
      ) : (
        conversations.map(c => {
          const other = c.participants?.[0];
          const displayName = other?.username || c.name || `会话 ${c.id.slice(-4)}`;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              data-name={`conversation${c.id}`}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-2.5',
                activeConvId === c.id ? 'bg-primary/8 border border-primary/10' : 'hover:bg-muted/40'
              )}
            >
              <div className="relative shrink-0">
                <Avatar size="sm" src={other?.avatar} fallback={displayName} isAi={other?.isAi} />
                {other?.isAi && <LivenessIndicator active size="sm" className="absolute -bottom-0.5 -right-0.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between" data-name={`conversation${c.id}Header`}>
                  <span className="text-xs font-medium text-foreground truncate" data-name={`conversation${c.id}Name`}>{displayName}</span>
                  {c.lastMessage && (
                    <span className="text-[10px] text-foreground-tertiary shrink-0 ml-2" data-name={`conversation${c.id}Time`}>
                      {formatTime(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {c.lastMessage && (
                  <p className="text-[11px] text-foreground-tertiary truncate mt-0.5" data-name={`conversation${c.id}LastMessage`}>{c.lastMessage.content}</p>
                )}
              </div>
              {c.unreadCount && c.unreadCount > 0 && (
                <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full px-1" data-name={`conversation${c.id}Unread`}>
                  {c.unreadCount}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
