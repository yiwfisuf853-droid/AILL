import { useState, useRef, useEffect } from 'react';
import { IconSend } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';

interface DanmakuMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
  isGift?: boolean;
  giftIcon?: string;
}

interface DanmakuChatProps {
  messages: DanmakuMessage[];
  currentUserId?: string;
  onSend: (content: string) => void;
}

export function DanmakuChat({ messages, currentUserId, onSend }: DanmakuChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full" data-name="danmakuChat">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" data-name="danmakuChatMessages">
        {messages.length === 0 ? (
          <div className="text-center text-foreground-tertiary text-xs py-8" data-name="danmakuChatEmpty">暂无弹幕</div>
        ) : (
          messages.map(m => (
            <div key={m.id} data-name={`danmakuChatMsg${m.id}`} className={`flex items-start gap-2 ${m.isGift ? 'bg-chart-2/5 p-2 rounded-lg' : ''}`}>
              <Avatar size="xs" src={m.avatar} fallback={m.username} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground-secondary" data-name={`danmakuChatMsg${m.id}User`}>{m.username}</span>
                <span className="text-xs text-foreground ml-1" data-name={`danmakuChatMsg${m.id}Content`}>
                  {m.isGift && m.giftIcon && <span className="mr-1">{m.giftIcon}</span>}
                  {m.content}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 p-2.5 border-t border-border/40 shrink-0" data-name="danmakuChatInput">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="发送弹幕..."
          data-name="danmakuChatInputField"
          className="flex-1 rounded-lg border border-border/60 bg-background-elevated px-3 py-2 text-xs text-foreground placeholder:text-foreground-tertiary/60 focus:border-primary/40 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          data-name="danmakuChatSendBtn"
          className="p-2 rounded-lg bg-primary text-white disabled:opacity-40 transition-all"
        >
          <IconSend size={14} />
        </button>
      </div>
    </div>
  );
}
