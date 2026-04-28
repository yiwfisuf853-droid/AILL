import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { messageApi, type Conversation, type Message } from '../api';
import { useSocket } from '@/lib/useSocket';
import { useMessageStore } from '../store';
import { IconComment, IconSave, IconChevronLeft, IconSend } from '@/components/ui/icon';

export function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { on, emit } = useSocket();
  const { incrementUnread } = useMessageStore();

  useEffect(() => {
    if (!user) return;
    messageApi.getConversations(user.id).then(setConversations).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const cleanup = on('new-message', (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === activeConv) { setMessages(prev => [...prev, data.message]); }
      else { incrementUnread(); }
    });
    return cleanup;
  }, [on, activeConv, incrementUnread]);

  useEffect(() => {
    if (!user || !activeConv) return;
    messageApi.getMessages(user.id, activeConv).then(setMessages).catch(() => {});
  }, [user, activeConv]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!user || !activeConv || !input.trim()) return;
    try {
      const msg = await messageApi.sendMessage(user.id, activeConv, input.trim());
      setMessages(prev => [...prev, msg]);
      emit('send-message', { conversationId: activeConv, message: msg });
      setInput('');
    } catch {}
  };

  if (!user) {
    return <div data-name="messagesPage.loginRequired" className="flex items-center justify-center py-12 text-foreground-tertiary text-sm">请先登录</div>;
  }

  return (
    <div data-name="messagesPage" className="py-4">
      {/* Header */}
      <div data-name="messagesPage.header" className="flex items-center gap-2 mb-5">
        <button data-name="messagesPage.backBtn" onClick={() => window.history.back()} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="section-header-bar" style={{ background: 'hsl(270,65%,60%)' }} />
        <h1 data-name="messagesPage.title" className="text-lg font-bold text-foreground">私信</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 h-[min(calc(100vh-200px),600px)] min-h-[380px]">
        {/* Conversation list */}
        <div data-name="messagesPage.conversationList" className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div data-name="messagesPage.conversationListHeader" className="px-3 py-2.5 border-b border-border/40 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">会话</div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 38px)' }}>
            {loading ? (
              <div data-name="messagesPage.conversationLoading" className="p-4 text-center text-foreground-tertiary text-xs">加载中...</div>
            ) : !conversations.length ? (
              <div data-name="messagesPage.conversationEmpty" className="p-6 text-center text-foreground-tertiary text-xs">
                <IconComment size={28} className="mx-auto mb-2 opacity-30" />
                暂无私信
              </div>
            ) : (
              conversations.map(c => (
                <button key={c.id} data-name={`messagesPage.conversation.${c.id}`} onClick={() => setActiveConv(c.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors ${
                    activeConv === c.id ? 'bg-primary/8' : 'hover:bg-muted/40'
                  }`}>
                  <div data-name={`messagesPage.conversation.${c.id}.name`} className="text-xs font-medium text-foreground truncate">{c.name || `会话 ${c.id.slice(-4)}`}</div>
                  {c.lastMessage && (
                    <div data-name={`messagesPage.conversation.${c.id}.lastMessage`} className="text-[10px] text-foreground-tertiary truncate mt-0.5">{c.lastMessage.content}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message area */}
        <div data-name="messagesPage.messageArea" className="surface-panel overflow-hidden flex flex-col">
          {!activeConv ? (
            <div data-name="messagesPage.noConversationSelected" className="flex-1 flex items-center justify-center text-foreground-tertiary text-xs">
              选择一个会话开始聊天
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {!messages.length ? (
                  <div data-name="messagesPage.messagesEmpty" className="text-center text-foreground-tertiary text-xs py-10">暂无消息</div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} data-name={`messagesPage.message.${m.id}`} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs ${
                        m.senderId === user.id
                          ? 'bg-[hsl(270,65%,55%)] text-white'
                          : 'bg-muted text-foreground'
                      }`}>
                        {m.senderId !== user.id && (
                          <div className="text-[10px] font-medium opacity-70 mb-0.5">{m.senderName}</div>
                        )}
                        <div data-name={`messagesPage.message.${m.id}.content`}>{m.content}</div>
                        <div data-name={`messagesPage.message.${m.id}.time`} className={`text-[9px] mt-1 ${m.senderId === user.id ? 'text-white/50' : 'text-foreground-tertiary'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 p-2.5 border-t border-border/40">
                <input data-name="messagesPage.messageInput" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="输入消息..."
                  className="flex-1 rounded-lg border border-border/60 bg-background-elevated px-3 py-2 text-xs text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(270,65%,55%)]/40 focus:outline-none"
                />
                <button data-name="messagesPage.sendBtn" onClick={handleSend} disabled={!input.trim()}
                  className="p-2 rounded-lg text-white disabled:opacity-40 transition-all"
                  style={{ background: 'hsl(270,65%,55%)' }}>
                  <IconSend size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
