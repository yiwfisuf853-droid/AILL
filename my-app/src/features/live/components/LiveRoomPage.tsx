import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { liveApi } from '@/features/live/api';
import type { LiveRoom, LiveGift } from '@/features/live/types';
import { useAuthStore } from '@/features/auth/store';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { userApi } from '@/features/users/api';
import { IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconComment, IconEye, IconFire, IconGroup, IconHeart, IconLive, IconPlay, IconSave, IconStar, IconUser } from "@/components/ui/Icon";

interface LiveMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  type: 'message' | 'gift' | 'system';
  giftName?: string;
  giftIcon?: string;
  createdAt: string;
}

export function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [gifts, setGifts] = useState<LiveGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState('');
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingGift, setSendingGift] = useState<number | null>(null);
  const [followed, setFollowed] = useState(false);
  const [countdown, setCountdown] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load room data
  useEffect(() => {
    if (!id) return;
    loadRoomData();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  // Countdown timer for scheduled rooms
  useEffect(() => {
    if (!room || room.status !== 1 || !room.startTime) return;
    const update = () => {
      const diff = new Date(room.startTime!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('即将开始');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [room]);

  async function loadRoomData() {
    if (!id) return;
    setLoading(true);
    try {
      const [roomRes, msgRes, giftRes] = await Promise.all([
        liveApi.getRoomDetail(id),
        liveApi.getMessages(id, { limit: 50 }),
        liveApi.getGifts(),
      ]);
      const roomData: any = roomRes;
      const msgData: any = msgRes;
      const giftData: any = giftRes;
      setRoom(roomData.data || roomData);
      setMessages(Array.isArray(msgData) ? msgData : (msgData.list || msgData.data || []));
      setGifts(Array.isArray(giftData) ? giftData : (giftData.list || giftData.data || []));

      // Start polling messages for live rooms
      const liveRoom = roomData.data || roomData;
      if (liveRoom.status === 2) {
        startMessagePolling();
      }
    } catch (e) {
      console.error('Failed to load room data:', e);
    }
    setLoading(false);
  }

  function startMessagePolling() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const msgRes: any = await liveApi.getMessages(id, { limit: 20 });
        const newMessages = Array.isArray(msgRes) ? msgRes : (msgRes.list || msgRes.data || []);
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMessages.filter((m: LiveMessage) => !existingIds.has(m.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
      } catch {
        // silent
      }
    }, 5000);
  }

  async function handleSendMessage() {
    if (!id || !msgInput.trim() || sending) return;
    if (!isAuthenticated) return;
    setSending(true);
    try {
      await liveApi.sendMessage(id, { content: msgInput.trim() });
      // Optimistically add the message
      const optimisticMsg: LiveMessage = {
        id: `temp-${Date.now()}`,
        userId: user?.id || '',
        username: user?.username || '我',
        avatar: user?.avatar || '',
        content: msgInput.trim(),
        type: 'message',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setMsgInput('');
    } catch (e) {
      console.error('Failed to send message:', e);
    }
    setSending(false);
  }

  async function handleSendGift(gift: LiveGift) {
    if (!id || sendingGift !== null) return;
    if (!isAuthenticated) return;
    setSendingGift(gift.id);
    try {
      await liveApi.sendGift(id, { giftId: gift.id, quantity: 1 });
      // Add gift message
      const giftMsg: LiveMessage = {
        id: `gift-${Date.now()}`,
        userId: user?.id || '',
        username: user?.username || '我',
        avatar: user?.avatar || '',
        content: `送出了 ${gift.name}`,
        type: 'gift',
        giftName: gift.name,
        giftIcon: gift.icon,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, giftMsg]);
      // Update room like count optimistically
      if (room) {
        setRoom({ ...room, likeCount: room.likeCount + 1 });
      }
    } catch (e) {
      console.error('Failed to send gift:', e);
    }
    setSendingGift(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  if (loading) {
    return (
      <div data-name="liveRoomLoading" className="min-h-screen bg-[#0c0812] text-white">
        <PageSkeleton />
      </div>
    );
  }

  if (!room) {
    return (
      <div data-name="liveRoomNotFound" className="min-h-screen bg-[#0c0812] text-white flex flex-col items-center justify-center gap-4">
        <IconLive size={48} className="text-zinc-600" />
        <p className="text-zinc-400" data-name="liveRoomNotFoundText">直播间不存在或已关闭</p>
        <Link
          to="/live"
          className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
          data-name="liveRoomNotFoundBackLink"
        >
          <IconChevronLeft size={16} /> 返回直播列表
        </Link>
      </div>
    );
  }

  const isLive = room.status === 2;
  const isEnded = room.status === 3;
  const isScheduled = room.status === 1;

  return (
    <div className="min-h-screen bg-[#0c0812] text-white" data-name="liveRoom">
      <div data-name="liveRoomContainer" className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Back navigation */}
        <Link
          to="/live"
          className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-300 text-sm mb-4 transition-colors"
          data-name="liveRoomBackLink"
        >
          <IconChevronLeft size={16} /> 返回直播列表
        </Link>

        <div data-name="liveRoomMainLayout" className="flex flex-col lg:flex-row gap-4">
          {/* Left column: Video + Streamer Info + Chat */}
          <div data-name="liveRoomMainColumn" className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Video Area */}
            <div className="relative aspect-video bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl overflow-hidden border border-zinc-800/50" data-name="liveRoomVideo">
              {/* Cover image or placeholder */}
              {room.coverImage ? (
                <img
                  src={room.coverImage}
                  alt={room.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              ) : null}

              {/* Center content based on status */}
              <div data-name="liveRoomVideoCenter" className="absolute inset-0 flex items-center justify-center">
                {isLive && (
                  <div data-name="liveRoomLiveIndicatorWrap" className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-sm border border-red-500/30 animate-pulse" data-name="liveRoomLiveIndicator">
                      <IconFire size={40} className="text-red-400" />
                    </div>
                    <span className="text-zinc-300 text-sm" data-name="liveRoomLiveText">直播进行中...</span>
                  </div>
                )}
                {isEnded && (
                  <div className="flex flex-col items-center gap-3" data-name="liveRoomEndedIndicator">
                    <IconPlay size={64} className="text-zinc-600" />
                    <span className="text-zinc-400 text-sm">直播已结束</span>
                  </div>
                )}
                {isScheduled && (
                  <div className="flex flex-col items-center gap-3" data-name="liveRoomScheduledIndicator">
                    <IconClock size={64} className="text-blue-400/50" />
                    <span className="text-zinc-400 text-sm">直播预告</span>
                    {countdown && (
                      <span className="text-2xl font-mono text-blue-300 tracking-widest" data-name="liveRoomCountdown">{countdown}</span>
                    )}
                  </div>
                )}
              </div>

              {/* LIVE badge - top left */}
              {isLive && (
                <div data-name="liveRoomLiveBadgeWrap" className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-600/90 text-white shadow-lg shadow-red-500/30" data-name="liveRoomLiveBadge">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
              )}

              {/* Scheduled badge */}
              {isScheduled && (
                <div data-name="liveRoomScheduledBadgeWrap" className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30" data-name="liveRoomScheduledBadge">
                    <IconClock size={12} /> 预告
                  </span>
                </div>
              )}

              {/* Ended badge */}
              {isEnded && (
                <div data-name="liveRoomEndedBadgeWrap" className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" data-name="liveRoomEndedBadge">
                    已结束
                  </span>
                </div>
              )}

              {/* View count - top right */}
              <div data-name="liveRoomViewCountWrap" className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-black/50 backdrop-blur-sm text-zinc-300" data-name="liveRoomViewCount">
                  <IconEye size={14} /> {room.viewCount}
                </span>
              </div>

              {/* Red glow for live status */}
              {isLive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-red-500/20 rounded-full blur-[60px] pointer-events-none" />
              )}
            </div>

            {/* Streamer Info Bar */}
            <div className="flex items-center justify-between gap-4 bg-zinc-900/60 rounded-xl px-4 py-3 border border-zinc-800/50" data-name="liveRoomStreamerInfo">
              <div data-name="liveRoomStreamerMeta" className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden" data-name="liveRoomStreamerAvatar">
                  {room.streamer?.avatar ? (
                    <img src={room.streamer.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (room.streamer?.username || '主')[0]
                  )}
                </div>
                <div data-name="liveRoomStreamerDetails" className="min-w-0">
                  <p className="font-semibold text-sm truncate" data-name="liveRoomStreamerName">{room.streamer?.username || '主播'}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1" data-name="liveRoomStreamerViewCount">
                    <IconGroup size={12} /> {room.viewCount} 观看
                  </p>
                </div>
              </div>
              <div data-name="liveRoomStreamerActions" className="flex items-center gap-2 flex-shrink-0">
                {isAuthenticated && user?.id !== room.userId && (
                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await userApi.toggleFollow(room.userId);
                        setFollowed(!followed);
                      } catch { /* silent */ }
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      followed
                        ? 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/50'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/20'
                    }`}
                    data-name="liveRoomFollowBtn"
                  >
                    {followed ? <IconCheck size={16} /> : <IconUser size={16} />}
                    {followed ? '已关注' : '关注'}
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs text-zinc-500" data-name="liveRoomLikeCount">
                  <IconHeart size={14} className="text-red-400" /> {room.likeCount}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden" style={{ height: 400 }} data-name="liveRoomChat">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/60" data-name="liveRoomChatHeader">
                <div data-name="liveRoomChatHeaderTitle" className="flex items-center gap-2 text-sm font-medium">
                  <IconComment size={16} className="text-red-400" />
                  弹幕聊天
                </div>
                <span className="text-xs text-zinc-500" data-name="liveRoomChatMsgCount">{messages.length} 条消息</span>
              </div>

              {/* Messages list */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scroll-smooth"
                data-name="liveRoomChatMessages"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm" data-name="liveRoomChatEmpty">
                    暂无消息，快来发送第一条弹幕吧
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} data-name={`liveRoomChatMsg${msg.id}`} className="flex items-start gap-2 group">
                      {msg.type === 'system' ? (
                        <div data-name={`liveRoomChatMsg${msg.id}System`} className="text-xs text-zinc-500 py-1 px-3 w-full text-center">
                          {msg.content}
                        </div>
                      ) : msg.type === 'gift' ? (
                        <div data-name={`liveRoomChatMsg${msg.id}Gift`} className="flex items-center gap-2 py-1 px-3 rounded-lg bg-pink-500/10 border border-pink-500/10 w-full">
                          <span className="text-lg">{msg.giftIcon || '🎁'}</span>
                          <span className="text-xs text-pink-300 font-medium">{msg.username}</span>
                          <span className="text-xs text-zinc-400">送出</span>
                          <span className="text-xs text-pink-200 font-semibold">{msg.giftName || msg.content}</span>
                        </div>
                      ) : (
                        <>
                          <div data-name={`liveRoomChatMsg${msg.id}Avatar`} className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[10px] font-medium overflow-hidden">
                            {msg.avatar ? (
                              <img src={msg.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              msg.username[0]
                            )}
                          </div>
                          <div data-name={`liveRoomChatMsg${msg.id}Text`} className="min-w-0">
                            <span className="text-xs text-red-400 font-medium mr-1.5">{msg.username}</span>
                            <span className="text-sm text-zinc-300 break-all">{msg.content}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2 px-3 py-2.5 border-t border-zinc-800/50 bg-zinc-900/60" data-name="liveRoomChatInput">
                  <input
                    type="text"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="发送弹幕..."
                    className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                    disabled={!isLive && !isEnded}
                    data-name="liveRoomChatInputField"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!msgInput.trim() || sending || (!isLive && !isEnded)}
                    className="p-2.5 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-red-500/20 transition-all"
                    data-name="liveRoomSendBtn"
                  >
                    <IconSave size={16} />
                  </button>
                </div>
              ) : (
                <div data-name="liveRoomChatLoginPrompt" className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-900/60 text-center">
                  <Link to="/auth/login" className="text-red-400 hover:text-red-300 text-sm" data-name="liveRoomLoginPrompt">
                    登录后即可发送弹幕
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Gift Panel (desktop) */}
          <div data-name="liveRoomRightColumn" className="hidden lg:flex flex-col w-80 flex-shrink-0">
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col" style={{ height: '100%' }} data-name="liveRoomGiftPanel">
              {/* Gift panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/60" data-name="liveRoomGiftPanelHeader">
                <div data-name="liveRoomGiftPanelHeaderTitle" className="flex items-center gap-2 text-sm font-medium">
                  <IconStar size={16} className="text-pink-400" />
                  礼物打赏
                </div>
              </div>

              {/* Gifts grid */}
              <div className="flex-1 overflow-y-auto p-3" data-name="liveRoomGiftGrid">
                {gifts.length === 0 ? (
                  <div data-name="liveRoomGiftEmpty" className="flex items-center justify-center h-32 text-zinc-600 text-sm">
                    暂无可用礼物
                  </div>
                ) : (
                  <div data-name="liveRoomGiftGridDesktop" className="grid grid-cols-3 gap-2">
                    {gifts.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => handleSendGift(g)}
                        disabled={sendingGift !== null || !isAuthenticated}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                          sendingGift === g.id
                            ? 'bg-pink-500/20 border-pink-500/40 shadow-lg shadow-pink-500/10'
                            : 'bg-zinc-800/30 border-zinc-800/30 hover:border-pink-500/30 hover:bg-pink-500/5'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        data-name={`liveRoomGift${g.id}`}
                      >
                        <span className="text-2xl">{g.icon}</span>
                        <span className="text-xs font-medium truncate w-full text-center">{g.name}</span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                          <IconStar size={10} /> {g.pointsPrice}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isAuthenticated && (
                <div data-name="liveRoomGiftLoginPromptWrap" className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-900/60 text-center">
                  <Link to="/auth/login" className="text-red-400 hover:text-red-300 text-xs" data-name="liveRoomGiftLoginPrompt">
                    登录后即可送礼物
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Gift Panel - collapsible at bottom */}
        <div data-name="liveRoomMobileGiftSection" className="lg:hidden mt-4">
          <button
            onClick={() => setGiftPanelOpen(!giftPanelOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 rounded-xl border border-zinc-800/50 text-sm"
            data-name="liveRoomMobileGiftToggle"
          >
            <span className="flex items-center gap-2 font-medium">
              <IconStar size={16} className="text-pink-400" />
              礼物打赏
            </span>
            {giftPanelOpen ? <IconChevronLeft size={16} className="text-zinc-400" /> : <IconChevronRight size={16} className="text-zinc-400" />}
          </button>

          {giftPanelOpen && (
            <div className="mt-2 bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-3" data-name="liveRoomMobileGiftPanel">
              {gifts.length === 0 ? (
                <div data-name="liveRoomMobileGiftEmpty" className="text-center py-6 text-zinc-600 text-sm">暂无可用礼物</div>
              ) : (
                <div data-name="liveRoomMobileGiftGrid" className="grid grid-cols-4 gap-2">
                  {gifts.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleSendGift(g)}
                      disabled={sendingGift !== null || !isAuthenticated}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                        sendingGift === g.id
                          ? 'bg-pink-500/20 border-pink-500/40'
                          : 'bg-zinc-800/30 border-zinc-800/30 hover:border-pink-500/30 hover:bg-pink-500/5'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="text-xl">{g.icon}</span>
                      <span className="text-[10px] font-medium truncate w-full text-center">{g.name}</span>
                      <span className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                        <IconStar size={8} /> {g.pointsPrice}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {!isAuthenticated && (
                <div data-name="liveRoomMobileGiftLoginPromptWrap" className="text-center mt-3">
                  <Link to="/auth/login" className="text-red-400 hover:text-red-300 text-xs" data-name="liveRoomMobileGiftLoginPrompt">
                    登录后即可送礼物
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
