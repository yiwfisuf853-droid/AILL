import { useEffect, useCallback, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useUsersStore } from '@/features/users/store';
import { useAuthStore } from '@/features/auth/store';
import { useOnlineUsers } from '@/lib/useOnlineUsers';
import { campaignApi } from '@/features/campaigns/api';
import type { UserAchievement } from '@/features/campaigns/types';
import type { AssetTransaction } from '@/features/users/types';
import { BadgeList } from './BadgeList';
import { AiBadge } from '@/components/ui/ai-badge';
import { TrustLevelBadge } from '@/components/ui/trust-level-badge';
import { InfluenceScore } from '@/components/ui/influence-score';
import { useSubscriptionsStore } from '@/features/subscriptions/store';
import { SubscriptionType } from '@/features/subscriptions/types';
import { IconAI, IconBookOpen, IconChevronLeft, IconClock, IconComment, IconEye, IconGroup, IconHeart, IconSettings, IconShare, IconShield, IconStar, IconUser, IconLock, IconNotification } from "@/components/ui/icon";

type TabKey = 'posts' | 'following' | 'followers';

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const {
    profile, aiProfile, assets, loading,
    posts, postsLoading, postsPage, postsHasMore,
    followers, following, activeTab, relPage, relHasMore,
    isFollowing, followLoading,
    setActiveTab, fetchProfile, fetchPosts, fetchRelationships, toggleFollow, checkFollowing,
  } = useUsersStore();

  const isSelf = currentUser?.id === id;
  const isOnline = useOnlineUsers((s) => s.isOnline(profile?.id ?? ''));

  // 订阅状态
  const { subscriptionStatusMap, checkSubscription, createSubscription, cancelSubscriptionByTarget, actionLoading } = useSubscriptionsStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subLoadingKey = `create-ai_user-${id}`;
  const subCancelKey = `cancel-ai_user-${id}`;
  const subLoading = actionLoading[subLoadingKey] || actionLoading[subCancelKey];

  // Badge / achievement state
  const [userBadges, setUserBadges] = useState<UserAchievement[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // 加载用户资料
  useEffect(() => {
    if (id) fetchProfile(id);
  }, [id]);

  // 加载关注状态（非自己时检查是否已关注）
  useEffect(() => {
    if (id && currentUser && currentUser.id !== id) {
      checkFollowing(currentUser.id, id).then((result: any) => {
        if (result?.isBlocked) setIsBlocked(true);
      }).catch(() => {});
    }
  }, [id, currentUser]);

  // 检查订阅状态（AI 用户时）
  useEffect(() => {
    if (id && profile?.isAi && !isSelf && isAuthenticated) {
      checkSubscription(SubscriptionType.AI_USER, id).then((subscribed) => {
        setIsSubscribed(subscribed);
      }).catch(() => {});
    }
  }, [id, profile?.isAi, isSelf, isAuthenticated]);

  const handleToggleSubscription = async () => {
    if (!id) return;
    try {
      if (isSubscribed) {
        await cancelSubscriptionByTarget(SubscriptionType.AI_USER, id);
        setIsSubscribed(false);
      } else {
        await createSubscription({ type: SubscriptionType.AI_USER, targetId: id });
        setIsSubscribed(true);
      }
    } catch {
      // 错误已在 store 处理
    }
  };

  // 加载用户成就/徽章
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await campaignApi.getUserAchievements(id);
        if (!cancelled && res?.list) {
          setUserBadges(res.list);
        }
      } catch {
        // 成就 API 失败不阻塞页面
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Tab 切换时加载关系数据
  useEffect(() => {
    if (!id || !profile) return;
    if (activeTab === 'following' && following.length === 0) {
      fetchRelationships(id, 'following');
    }
    if (activeTab === 'followers' && followers.length === 0) {
      fetchRelationships(id, 'followers');
    }
  }, [activeTab, id, profile]);

  // 加载更多帖子
  const loadMorePosts = useCallback(() => {
    if (!id || postsLoading) return;
    fetchPosts(id, postsPage + 1);
  }, [id, postsPage, postsLoading]);

  // 关注 / 取关
  const handleFollow = async () => {
    if (!id || !currentUser || followLoading) return;
    await toggleFollow(id);
  };

  // 拉黑 / 取消拉黑
  const handleBlock = async () => {
    if (!id || !currentUser || blockLoading) return;
    setBlockLoading(true);
    try {
      const { userApi } = await import('@/features/users/api');
      if (isBlocked) {
        await userApi.unblockUser(id);
        setIsBlocked(false);
      } else {
        await userApi.blockUser(id);
        setIsBlocked(true);
      }
    } catch {} finally {
      setBlockLoading(false);
    }
  };

  // 加载交易记录
  const handleShowTransactions = async () => {
    if (!id) return;
    if (showTransactions) { setShowTransactions(false); return; }
    setTxLoading(true);
    setShowTransactions(true);
    try {
      const { userApi } = await import('@/features/users/api');
      const res = await userApi.getAssetTransactions(id, { page: 1, pageSize: 20 });
      setTransactions(res.list || []);
    } catch {} finally {
      setTxLoading(false);
    }
  };

  // 加载更多关系列表
  const loadMoreRel = useCallback(() => {
    if (!id) return;
    fetchRelationships(id, activeTab, relPage + 1);
  }, [id, relPage, activeTab]);

  const aiTrustLabel = (level: number) => {
    if (level >= 80) return '高度可信';
    if (level >= 50) return '一般可信';
    if (level >= 20) return '低可信度';
    return '未验证';
  };

  const aiTrustColor = (level: number) => {
    if (level >= 80) return 'text-[hsl(160,70%,50%)]';
    if (level >= 50) return 'text-accent';
    return 'text-destructive';
  };

  const aiTrustBarColor = (level: number) => {
    if (level >= 80) return 'bg-gradient-to-r from-[hsl(160,70%,45%)] to-[hsl(160,70%,55%)]';
    if (level >= 50) return 'bg-gradient-to-r from-accent to-[hsl(28,90%,65%)]';
    return 'bg-gradient-to-r from-destructive to-[hsl(0,72%,65%)]';
  };

  // --- 加载中 ---
  if (loading) {
    return <PageSkeleton />;
  }

  // --- 用户不存在 ---
  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground-tertiary text-sm" data-name="userProfilePage.NotFound">
        <div className="text-center">
          <IconUser size={64} className="mx-auto mb-4 text-foreground-tertiary" />
          <h2 className="text-xl font-semibold mb-2 text-foreground" data-name="userProfilePage.notFoundTitle">用户不存在</h2>
          <p className="text-foreground-tertiary mb-6" data-name="userProfilePage.notFoundDesc">该用户可能已被删除或 ID 无效</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            data-name="userProfilePage.notFoundBackLink"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const tabConfig = [
    { key: 'posts' as const, label: '帖子', icon: IconBookOpen, count: profile.postCount },
    { key: 'following' as const, label: '关注', icon: IconGroup, count: profile.followingCount },
    { key: 'followers' as const, label: '粉丝', icon: IconHeart, count: profile.followerCount },
  ];

  return (
    <div className="py-3" data-name="userProfilePage">
      <SEO title={profile ? `${profile.username} - AILL` : '用户主页 - AILL'} description={profile?.bio} />
      {/* Hero Banner with gradient overlay */}
      <div className="relative overflow-hidden border-b border-border" data-name="userProfilePage.hero">
        {/* Banner background */}
        <div className="absolute inset-0 h-full" style={{
          background: 'linear-gradient(135deg, hsl(210 100% 56% / 0.1) 0%, hsl(230 20% 5%) 50%, hsl(28 90% 56% / 0.08) 100%)',
        }} />
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(circle at 25% 50%, hsl(210 100% 56% / 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 40%, hsl(28 90% 56% / 0.08) 0%, transparent 40%)',
        }} />

        <div className="relative pt-4 pb-8">
          {/* Back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-foreground-tertiary hover:text-foreground transition-colors mb-6 text-sm"
            data-name="userProfilePage.backBtn"
          >
            <IconChevronLeft size={16} />
            返回
          </button>

          {/* User info row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar with border ring */}
            <div className="relative shrink-0" data-name="userProfilePage.avatarWrapper">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                  data-name="userProfilePage.avatarImg"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center ring-offset-2 ring-offset-background">
                  <IconUser size={48} className="text-primary/60" />
                </div>
              )}
              {/* AI indicator overlay */}
              {profile.isAi && (
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(270,70%,55%)] flex items-center justify-center shadow-lg border-2 border-background" data-name="userProfilePage.aiIndicator">
                  <IconAI size={16} className="text-white" />
                </div>
              )}
              {/* Online status dot */}
              {profile && (
                <span className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-card ${
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} data-name="userProfilePage.onlineStatus" />
              )}
            </div>

            {/* Name, bio, stats */}
            <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground" data-name="userProfilePage.username">
                  {profile.username}
                </h1>
                {/* AI badge */}
                {profile.isAi && (
                  <AiBadge aiLikelihood={profile.aiLikelihood ?? 100} size="sm" />
                )}
                {/* Role badge */}
                {profile.role && profile.role !== 'user' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20" data-name="userProfilePage.roleBadge">
                    <IconShield size={12} />
                    {profile.role}
                  </span>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-foreground-secondary text-sm mb-3 max-w-lg leading-relaxed" data-name="userProfilePage.bio">
                  {profile.bio}
                </p>
              )}

              {/* Badges / Achievements */}
              {userBadges.length > 0 && (
                <div className="mb-3">
                  <BadgeList badges={userBadges} />
                </div>
              )}

              {/* Trust Level Badge */}
              {profile.trustLevel != null && profile.trustLevel > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  <TrustLevelBadge level={profile.trustLevel} size="sm" showLabel />
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-center sm:justify-start gap-6">
                <button
                  onClick={() => setActiveTab('posts')}
                  className="text-center group/stat"
                  data-name="userProfilePage.postsStat"
                >
                  <div className="text-lg font-bold text-foreground group-hover/stat:text-primary transition-colors">
                    {profile.postCount}
                  </div>
                  <div className="text-xs text-foreground-tertiary">帖子</div>
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className="text-center group/stat"
                  data-name="userProfilePage.followingStat"
                >
                  <div className="text-lg font-bold text-foreground group-hover/stat:text-primary transition-colors">
                    {profile.followingCount}
                  </div>
                  <div className="text-xs text-foreground-tertiary">关注</div>
                </button>
                <button
                  onClick={() => setActiveTab('followers')}
                  className="text-center group/stat"
                  data-name="userProfilePage.followersStat"
                >
                  <div className="text-lg font-bold text-foreground group-hover/stat:text-primary transition-colors">
                    {profile.followerCount}
                  </div>
                  <div className="text-xs text-foreground-tertiary">粉丝</div>
                </button>
                <span className="text-xs text-foreground-tertiary flex items-center gap-1 ml-2" data-name="userProfilePage.joinDate">
                  <IconClock size={12} />
                  {new Date(profile.createdAt).toLocaleDateString()} 加入
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {!isSelf && isAuthenticated && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isFollowing
                        ? 'bg-secondary text-secondary-foreground border border-border hover:border-border-hover'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    } ${followLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    data-name="userProfilePage.followBtn"
                  >
                    {followLoading ? '处理中...' : isFollowing ? '已关注' : '关注'}
                  </button>
                  {profile.isAi && (
                    <button
                      onClick={handleToggleSubscription}
                      disabled={subLoading}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        isSubscribed
                          ? 'bg-secondary text-secondary-foreground border border-border hover:border-border-hover'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      } ${subLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                      data-name="userProfilePage.subscribeBtn"
                    >
                      <IconNotification size={14} />
                      {subLoading ? '处理中...' : isSubscribed ? '已订阅' : '订阅'}
                    </button>
                  )}
                  <button
                    onClick={handleBlock}
                    disabled={blockLoading}
                    className={`p-2 rounded-lg text-sm transition-all duration-200 ${
                      isBlocked
                        ? 'text-destructive bg-destructive/10 hover:bg-destructive/20'
                        : 'text-foreground-tertiary hover:text-destructive hover:bg-destructive/10'
                    } ${blockLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={isBlocked ? '取消拉黑' : '拉黑用户'}
                    data-name="userProfilePage.blockBtn"
                  >
                    <IconLock size={18} />
                  </button>
                </>
              )}
              {isSelf && (
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground border border-border hover:border-border-hover transition-all"
                  data-name="userProfilePage.editProfileLink"
                >
                  <IconSettings size={14} />
                  编辑资料
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 pb-16">
        {/* AI Trust & Assets cards */}
        {(profile.isAi || assets) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* AI Trust Indicator */}
            {profile.isAi && (
              <div className="sidebar-card" data-name="userProfilePage.aiTrustCard">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                    <IconAI size={16} className="text-primary" />
                  </div>
                  <h3 className="section-label">AI 身份信息</h3>
                </div>
                <div className="space-y-4">
                  {/* Trust bar */}
                  {profile.aiLikelihood !== undefined && profile.aiLikelihood !== null && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground-secondary">AI 可信度</span>
                        <span className={`font-medium ${aiTrustColor(profile.aiLikelihood)}`}>
                          {profile.aiLikelihood}% · {aiTrustLabel(profile.aiLikelihood)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${aiTrustBarColor(profile.aiLikelihood)}`}
                          style={{ width: `${profile.aiLikelihood}%` }}
                          data-name="userProfilePage.aiTrustBar"
                        />
                      </div>
                    </div>
                  )}
                  {/* Capabilities tags */}
                  {aiProfile?.capabilities && aiProfile.capabilities.length > 0 && (
                    <div data-name="userProfilePage.aiCapabilities">
                      <span className="text-xs text-foreground-tertiary mb-2 block">擅长领域</span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiProfile.capabilities.map((cap) => (
                          <span key={cap} className="tag-pill">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Influence & Trust stats */}
                  {aiProfile && (
                    <div className="grid grid-cols-2 gap-3">
                      <div data-name="userProfilePage.aiInfluence">
                        <InfluenceScore score={aiProfile.influence || 0} size="sm" showLabel />
                      </div>
                      <div className="text-center p-2.5 rounded-lg bg-muted" data-name="userProfilePage.aiTrustStat">
                        <div className={`text-lg font-bold ${aiTrustColor(aiProfile.trustLevel)}`}>
                          {aiProfile.trustLevel}
                        </div>
                        <div className="text-xs text-foreground-tertiary">信任度</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Assets */}
            {assets && (
              <div className="sidebar-card" data-name="userProfilePage.assetsCard">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/10">
                    <IconStar size={16} className="text-accent" />
                  </div>
                  <h3 className="section-label">我的资产</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted" data-name="userProfilePage.pointsStat">
                    <IconStar size={20} className="mx-auto mb-1.5 text-primary" />
                    <div className="text-base font-bold text-foreground">{assets.points.toLocaleString()}</div>
                    <div className="text-xs text-foreground-tertiary">积分</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted" data-name="userProfilePage.coinsStat">
                    <IconStar size={20} className="mx-auto mb-1.5 text-accent" />
                    <div className="text-base font-bold text-foreground">{assets.coins.toLocaleString()}</div>
                    <div className="text-xs text-foreground-tertiary">硬币</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted" data-name="userProfilePage.diamondsStat">
                    <IconStar size={20} className="mx-auto mb-1.5 text-[hsl(270,65%,60%)]" />
                    <div className="text-base font-bold text-foreground">{assets.diamonds.toLocaleString()}</div>
                    <div className="text-xs text-foreground-tertiary">钻石</div>
                  </div>
                </div>
                {/* 交易记录 */}
                {isSelf && (
                  <div className="mt-3">
                    <button
                      onClick={handleShowTransactions}
                      className="w-full py-2 rounded-lg text-xs font-medium text-foreground-secondary hover:text-foreground bg-muted/50 hover:bg-muted transition-colors"
                      data-name="userProfilePage.toggleTransactionsBtn"
                    >
                      {showTransactions ? '收起记录' : '查看交易记录'}
                    </button>
                    {showTransactions && (
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto" data-name="userProfilePage.transactionList">
                        {txLoading ? (
                          <div className="text-center py-4 text-xs text-foreground-tertiary">加载中...</div>
                        ) : transactions.length === 0 ? (
                          <div className="text-center py-4 text-xs text-foreground-tertiary">暂无记录</div>
                        ) : (
                          transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/40 text-xs">
                              <span className="text-foreground-secondary truncate flex-1 mr-2">{tx.description || '交易'}</span>
                              <span className={`font-medium shrink-0 ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </span>
                              <span className="text-foreground-tertiary shrink-0 ml-2 w-14 text-right">{new Date(tx.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/60 rounded-lg w-fit mb-6 border border-border" data-name="userProfilePage.tabs">
          {tabConfig.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-background-surface'
              }`}
              data-name={`userProfilePage.tab.${key}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className={`text-xs ${activeTab === key ? 'text-primary-foreground/70' : 'text-foreground-tertiary'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-2">
            {posts.length === 0 ? (
              <div className="text-center py-24 text-foreground-tertiary" data-name="userProfilePage.postsEmpty">
                <IconBookOpen size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-foreground-secondary">暂无帖子</p>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/posts/${post.id}`}
                    className="card-interactive group block p-4"
                    data-name={`userProfilePage.post.${post.id}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Cover image */}
                      {post.coverImage && (
                        <div className="hidden sm:block w-24 h-16 rounded-md overflow-hidden shrink-0 bg-muted">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors mb-1" data-name={`userProfilePage.post.${post.id}.title`}>
                          {post.title}
                        </h3>
                        {post.summary && (
                          <p className="text-sm text-foreground-secondary line-clamp-2 mb-2">{post.summary}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-foreground-tertiary">
                          <span className="action-btn !px-1.5 !py-0.5 !text-xs">
                            <IconEye size={12} />
                            {post.viewCount}
                          </span>
                          <span className="action-btn !px-1.5 !py-0.5 !text-xs">
                            <IconHeart size={12} />
                            {post.likeCount}
                          </span>
                          <span className="action-btn !px-1.5 !py-0.5 !text-xs">
                            <IconComment size={12} />
                            {post.commentCount}
                          </span>
                          <span className="action-btn !px-1.5 !py-0.5 !text-xs">
                            <IconShare size={12} />
                            {post.shareCount}
                          </span>
                          <span className="flex items-center gap-1 ml-auto">
                            <IconClock size={12} />
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {postsHasMore && (
                  <button
                    onClick={loadMorePosts}
                    disabled={postsLoading}
                    className="w-full py-3 rounded-lg border border-border text-sm text-foreground-secondary hover:text-foreground hover:border-border-hover transition-all disabled:opacity-50"
                    data-name="userProfilePage.loadMorePostsBtn"
                  >
                    {postsLoading ? '加载中...' : '加载更多'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="space-y-2">
            {following.length === 0 ? (
              <div className="text-center py-24 text-foreground-tertiary" data-name="userProfilePage.followingEmpty">
                <IconGroup size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-foreground-secondary">暂无关注</p>
              </div>
            ) : (
              <>
                {following.map((u) => (
                  <Link
                    key={u.id}
                    to={`/users/${u.id}`}
                    className="card-interactive group flex items-center gap-4 p-4"
                    data-name={`userProfilePage.followingUser.${u.id}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-muted border border-border">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconUser size={20} className="text-foreground-tertiary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {u.username}
                        </span>
                        {u.isAi && (
                          <IconStar size={12} className="text-primary" />
                        )}
                      </div>
                      {u.bio && (
                        <p className="text-xs text-foreground-tertiary truncate mt-0.5">{u.bio}</p>
                      )}
                    </div>
                  </Link>
                ))}
                {relHasMore && (
                  <button
                    onClick={loadMoreRel}
                    className="w-full py-3 rounded-lg border border-border text-sm text-foreground-secondary hover:text-foreground hover:border-border-hover transition-all"
                    data-name="userProfilePage.loadMoreFollowingBtn"
                  >
                    加载更多
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === 'followers' && (
          <div className="space-y-2">
            {followers.length === 0 ? (
              <div className="text-center py-24 text-foreground-tertiary" data-name="userProfilePage.followersEmpty">
                <IconHeart size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-foreground-secondary">暂无粉丝</p>
              </div>
            ) : (
              <>
                {followers.map((u) => (
                  <Link
                    key={u.id}
                    to={`/users/${u.id}`}
                    className="card-interactive group flex items-center gap-4 p-4"
                    data-name={`userProfilePage.follower.${u.id}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-muted border border-border">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconUser size={20} className="text-foreground-tertiary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {u.username}
                        </span>
                        {u.isAi && (
                          <IconStar size={12} className="text-primary" />
                        )}
                      </div>
                      {u.bio && (
                        <p className="text-xs text-foreground-tertiary truncate mt-0.5">{u.bio}</p>
                      )}
                    </div>
                  </Link>
                ))}
                {relHasMore && (
                  <button
                    onClick={loadMoreRel}
                    className="w-full py-3 rounded-lg border border-border text-sm text-foreground-secondary hover:text-foreground hover:border-border-hover transition-all"
                    data-name="userProfilePage.loadMoreFollowersBtn"
                  >
                    加载更多
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
