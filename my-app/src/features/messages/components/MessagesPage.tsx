import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { messageApi, type Conversation, type Message, type CreateConversationResult } from '../api';
import { useSocket } from '@/hooks/useSocket';
import { useMessageStore } from '../store';
import { IconComment, IconPlus, IconChevronLeft, IconSend } from '@/components/ui/Icon';

export function MessagesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
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
        // 先检查是否已存在与该用户的会话
        const existingConvs = await messageApi.getConversations(user.id);
        const existingConv = existingConvs.find(conv => 
          conv.participants?.some(p => p.userId === targetUserId)
        );

        if (existingConv) {
          // 如果已存在会话，直接激活
          setActiveConv(existingConv.id);
        } else {
          // 如果不存在，创建新会话
          const result = await messageApi.createConversation({
            type: 'private',
            participantIds: [user.id, targetUserId],
          });
          // 激活新会话（后端返回格式是 {success, conversation, exists}）
          if (result?.conversation?.id) setActiveConv(result.conversation.id);
        }

        // 刷新会话列表
        const convs = await messageApi.getConversations(user.id);
        setConversations(convs);
        
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
    if (!user || !activeConv) {
      setActiveConversation(null);
      return;
    }
    messageApi.getMessages(user.id, activeConv).then(setMessages).catch(() => {});
    messageApi.getConversationDetail(user.id, activeConv).then(setActiveConversation).catch(() => {});
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
              conversations.map(c => {
                const otherParticipant = c.participants?.[0];
                const displayName = otherParticipant?.username || c.name || `会话 ${c.id.slice(-4)}`;
                return (
                  <button key={c.id} data-name={`messagesConversation${c.id}`} onClick={() => setActiveConv(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors flex items-center gap-2.5 ${
                      activeConv === c.id ? 'bg-primary/8' : 'hover:bg-muted/40'
                    }`}>
                    {otherParticipant?.avatar && (
                      <img 
                        src={otherParticipant.avatar} 
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                        data-name={`messagesConversation${c.id}Avatar`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div data-name={`messagesConversation${c.id}Name`} className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                        {displayName}
                        {otherParticipant?.isAi && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">AI</span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <div data-name={`messagesConversation${c.id}LastMessage`} className="text-xs text-foreground-tertiary truncate mt-0.5">{c.lastMessage.content}</div>
                      )}
                    </div>
                    {c.unreadCount && c.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full px-1.5">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
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
              {/* Conversation header */}
              <div data-name="messagesConversationHeader" className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/50">
                {activeConversation?.participants?.[0]?.avatar && (
                  <img 
                    src={activeConversation.participants[0].avatar} 
                    alt={activeConversation.participants[0].username}
                    className="w-9 h-9 rounded-full object-cover"
                    data-name="messagesConversationAvatar"
                  />
                )}
                <div className="flex-1">
                  <div data-name="messagesConversationName" className="text-sm font-medium text-foreground">
                    {activeConversation?.participants?.[0]?.username || '未知用户'}
                  </div>
                  <div data-name="messagesConversationStatus" className="text-xs text-foreground-tertiary">
                    {activeConversation?.participants?.[0]?.isAi ? 'AI 用户' : '在线'}
                  </div>
                </div>
              </div>
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
