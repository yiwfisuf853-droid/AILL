import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { messageApi, type Conversation, type Message } from '../api';
import { useSocket } from '@/hooks/useSocket';
import { useMessageStore } from '../store';
import { NotificationTab } from './NotificationTab';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { IconComment, IconPlus, IconBell, IconSettings } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type MessageSubTab = 'notifications' | 'chat';

export function MessagesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryTab = new URLSearchParams(location.search).get('tab');
  const initialSubTab: MessageSubTab = queryTab === 'chat' ? 'chat' : 'notifications';
  const [subTab, setSubTab] = useState<MessageSubTab>(initialSubTab);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const { on, emit } = useSocket();
  const { incrementUnread } = useMessageStore();
  const unreadNotifications = useMessageStore(s => s.unreadNotificationCount);

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get('tab') === 'chat' ? 'chat' : 'notifications';
    setSubTab(nextTab);
  }, [location.search]);

  useEffect(() => {
    if (!user) return;
    messageApi.getConversations(user.id).then(data => {
      setConversations(Array.isArray(data) ? data : []);
    }).catch(() => {
      setConversations([]);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const targetUserId = (location.state as any)?.startConversationWith;
    if (!user || !targetUserId) return;
    (async () => {
      try {
        const existingConvs = await messageApi.getConversations(user.id);
        const convArray = Array.isArray(existingConvs) ? existingConvs : [];
        const existingConv = convArray.find(conv =>
          conv.participants?.some(p => p.userId === targetUserId)
        );
        if (existingConv) {
          setActiveConv(existingConv.id);
        } else {
          const result = await messageApi.createConversation({
            type: 'private',
            participantIds: [user.id, targetUserId],
          });
          if (result?.conversation?.id) setActiveConv(result.conversation.id);
        }
        const convs = await messageApi.getConversations(user.id);
        setConversations(Array.isArray(convs) ? convs : []);
        setSubTab('chat');
        navigate(location.pathname, { replace: true, state: {} });
      } catch {}
    })();
  }, [user, location.state]);

  useEffect(() => {
    if (unreadNotifications > 0 && subTab === 'chat') {
      // keep on chat if user navigated there
    } else if (unreadNotifications > 0) {
      setSubTab('notifications');
    }
  }, []);

  useEffect(() => {
    const cleanup = on('new-message', (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === activeConv) { setMessages(prev => [...prev, data.message]); }
      else { incrementUnread(); }
    });
    return cleanup;
  }, [on, activeConv, incrementUnread]);

  const prevConvRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !activeConv) {
      setActiveConversation(null);
      return;
    }
    // 离开上一个对话房间
    if (prevConvRef.current && prevConvRef.current !== activeConv) {
      emit('leave-conversation', prevConvRef.current);
    }
    prevConvRef.current = activeConv;
    emit('join-conversation', activeConv);
    messageApi.getMessages(user.id, activeConv).then(setMessages).catch(() => {});
    messageApi.getConversationDetail(user.id, activeConv).then(setActiveConversation).catch(() => {});
    return () => {
      emit('leave-conversation', activeConv);
    };
  }, [user, activeConv, emit]);

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

  const chatUnread = (Array.isArray(conversations) ? conversations : []).reduce((sum: number, c: Conversation) => sum + (c.unreadCount || 0), 0);

  return (
    <div data-name="messages" className="py-4">
      <div className="flex items-center justify-between mb-5" data-name="messagesHeader">
        <h1 className="text-lg font-bold text-foreground" data-name="messagesTitle">消息</h1>
        <Link to="/settings" data-name="messagesSettingsBtn" className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-muted/50 transition-colors">
          <IconSettings size={16} />
        </Link>
      </div>

      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit mb-5" data-name="messagesSubTabs">
        <button
          onClick={() => navigate('/messages?tab=notifications')}
          data-name="messagesSubTabNotifications"
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
            subTab === 'notifications' ? 'bg-background text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground'
          )}
        >
          <IconBell size={14} /> 通知
          {unreadNotifications > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full px-1" data-name="messagesNotificationBadge">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/messages?tab=chat')}
          data-name="messagesSubTabChat"
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
            subTab === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground'
          )}
        >
          <IconComment size={14} /> 私信
          {chatUnread > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium text-white bg-primary rounded-full px-1" data-name="messagesChatBadge">
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          )}
        </button>
      </div>

      {subTab === 'notifications' ? (
        <NotificationTab />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 h-[min(calc(100vh-280px),560px)] min-h-[360px]" data-name="messagesChatLayout">
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden flex flex-col" data-name="messagesConversationPanel">
            <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between shrink-0" data-name="messagesConversationPanelHeader">
              <span className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">会话</span>
              <button data-name="messagesNewConversationBtn" title="新建会话" className="p-1 rounded-md text-foreground-tertiary hover:text-foreground hover:bg-muted/60 transition-colors">
                <IconPlus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5" data-name="messagesConversationScroll">
              {loading ? (
                <div className="p-4 text-center text-foreground-tertiary text-xs">加载中...</div>
              ) : (
                <ConversationList conversations={conversations} activeConvId={activeConv} onSelect={setActiveConv} />
              )}
            </div>
          </div>

          <div className="surfacePanel overflow-hidden flex flex-col" data-name="messagesChatArea">
            <ChatWindow
              conversation={activeConversation}
              messages={messages}
              currentUserId={user.id}
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
            />
          </div>
        </div>
      )}
    </div>
  );
}
