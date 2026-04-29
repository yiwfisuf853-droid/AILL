import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { messageApi, type Conversation, type Message } from '../api';
import { useSocket } from '@/hooks/useSocket';
import { useMessageStore } from '../store';
import { IconComment, IconPlus, IconChevronLeft, IconSend } from '@/components/ui/Icon';

export function MessagesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
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

  // 处理从用户主页跳转发起新会话
  useEffect(() => {
    const targetUserId = (location.state as any)?.startConversationWith;
    if (!user || !targetUserId) return;

    (async () => {
      try {
        const result = await messageApi.createConversation({
          type: 'private',
          participantIds: [user.id, targetUserId],
        });
        // 刷新会话列表
        const convs = await messageApi.getConversations(user.id);
        setConversations(convs);
        // 激活新会话
        if (result?.id) setActiveConv(result.id);
        // 清除 state 防止刷新重复触发
        navigate(location.pathname, { replace: true, state: {} });
      } catch {}
    })();
  }, [user, location.state]);

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
    return <div data-name="messagesLoginRequired" className="flex items-center justify-center py-12 text-foreground-tertiary text-sm">请先登录</div>;
  }

  return (
    <div data-name="messages" className="py-4">
      {/* Header */}
      <div data-name="messagesHeader" className="flex items-center gap-2 mb-5">
        <button data-name="messagesBackBtn" onClick={() => window.history.back()} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="sectionHeaderBar" style={{ background: 'hsl(270,65%,60%)' }} />
        <h1 data-name="messagesTitle" className="text-lg font-bold text-foreground">私信</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 h-[min(calc(100vh-200px),600px)] min-h-[380px]" data-name="messagesLayout">
        {/* Conversation list */}
        <div data-name="messagesConversationList" className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div data-name="messagesConversationListHeader" className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">会话</span>
            <button data-name="messagesNewConversationBtn" title="新建会话" className="p-1 rounded-md text-foreground-tertiary hover:text-foreground hover:bg-muted/60 transition-colors">
              <IconPlus size={14} />
            </button>
          </div>
          <div className="overflow-y-auto" data-name="messagesConversationScroll" style={{ maxHeight: 'calc(100% - 38px)' }}>
            {loading ? (
              <div data-name="messagesConversationLoading" className="p-4 text-center text-foreground-tertiary text-xs">加载中...</div>
            ) : !conversations.length ? (
              <div data-name="messagesConversationEmpty" className="p-6 text-center text-foreground-tertiary text-xs">
                <IconComment size={28} className="mx-auto mb-2 opacity-30" />
                暂无私信
              </div>
            ) : (
              conversations.map(c => (
                <button key={c.id} data-name={`messagesConversation${c.id}`} onClick={() => setActiveConv(c.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors ${
                    activeConv === c.id ? 'bg-primary/8' : 'hover:bg-muted/40'
                  }`}>
                  <div data-name={`messagesConversation${c.id}Name`} className="text-xs font-medium text-foreground truncate">{c.name || `会话 ${c.id.slice(-4)}`}</div>
                  {c.lastMessage && (
                    <div data-name={`messagesConversation${c.id}LastMessage`} className="text-xs text-foreground-tertiary truncate mt-0.5">{c.lastMessage.content}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message area */}
        <div data-name="messagesMessageArea" className="surfacePanel overflow-hidden flex flex-col">
          {!activeConv ? (
            <div data-name="messagesNoConversationSelected" className="flex-1 flex items-center justify-center text-foreground-tertiary text-xs">
              选择一个会话开始聊天
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5" data-name="messagesMessagesScroll">
                {!messages.length ? (
                  <div data-name="messagesMessagesEmpty" className="text-center text-foreground-tertiary text-xs py-10">暂无消息</div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} data-name={`messagesMessage${m.id}`} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs ${
                        m.senderId === user.id
                          ? 'bg-[hsl(270,65%,55%)] text-white'
                          : 'bg-muted text-foreground'
                      }`} data-name={`messagesMessage${m.id}Bubble`}>
                        {m.senderId !== user.id && (
                          <div className="text-xs font-medium opacity-70 mb-0.5" data-name={`messagesMessage${m.id}Sender`}>{m.senderName}</div>
                        )}
                        <div data-name={`messagesMessage${m.id}Content`}>{m.content}</div>
                        <div data-name={`messagesMessage${m.id}Time`} className={`text-[9px] mt-1 ${m.senderId === user.id ? 'text-white/50' : 'text-foreground-tertiary'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 p-2.5 border-t border-border/40" data-name="messagesInputArea">
                <input data-name="messagesMessageInput" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="输入消息..."
                  className="flex-1 rounded-lg border border-border/60 bg-background-elevated px-3 py-2 text-xs text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(270,65%,55%)]/40 focus:outline-none"
                />
                <button data-name="messagesSendBtn" onClick={handleSend} disabled={!input.trim()}
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
