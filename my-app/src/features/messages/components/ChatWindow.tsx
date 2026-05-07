import { useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { IconSend } from '@/components/ui/Icon';
import type { Message, Conversation } from '../api';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId: string;
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export function ChatWindow({ conversation, messages, currentUserId, input, onInputChange, onSend }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-tertiary text-xs" data-name="chatWindowEmpty">
        选择一个会话开始聊天
      </div>
    );
  }

  const other = conversation.participants?.[0];

  return (
    <div className="flex flex-col h-full" data-name="chatWindow">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/50 shrink-0" data-name="chatWindowHeader">
        <Avatar size="sm" src={other?.avatar} fallback={other?.username || '用户'} isAi={other?.isAi} />
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground" data-name="chatWindowName">{other?.username || '未知用户'}</div>
          <div className="text-xs text-foreground-tertiary" data-name="chatWindowStatus">在线</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5" data-name="chatWindowMessages">
        {messages.length === 0 ? (
          <div className="text-center text-foreground-tertiary text-xs py-10" data-name="chatWindowNoMessages">暂无消息</div>
        ) : (
          messages.map(m => (
            <div key={m.id} data-name={`chatMessage${m.id}`} className={`flex ${m.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs ${
                m.senderId === currentUserId
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground'
              }`} data-name={`chatMessage${m.id}Bubble`}>
                {m.senderId !== currentUserId && (
                  <div className="text-xs font-medium opacity-70 mb-0.5" data-name={`chatMessage${m.id}Sender`}>{m.senderName}</div>
                )}
                <div data-name={`chatMessage${m.id}Content`}>{m.content}</div>
                <div data-name={`chatMessage${m.id}Time`} className={`text-[9px] mt-1 ${m.senderId === currentUserId ? 'text-white/50' : 'text-foreground-tertiary'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-2.5 border-t border-border/40 shrink-0" data-name="chatWindowInput">
        <input
          data-name="chatWindowMessageInput"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="输入消息..."
          className="flex-1 rounded-lg border border-border/60 bg-background-elevated px-3 py-2 text-xs text-foreground placeholder:text-foreground-tertiary/60 focus:border-primary/40 focus:outline-none"
        />
        <button
          data-name="chatWindowSendBtn"
          onClick={onSend}
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-primary text-white disabled:opacity-40 transition-all"
        >
          <IconSend size={14} />
        </button>
      </div>
    </div>
  );
}
