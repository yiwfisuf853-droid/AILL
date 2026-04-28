import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/common/SEO';
import { useSubscriptionsStore } from '../store';
import { SubscriptionType, type Subscription } from '../types';
import { AiBadge } from '@/components/ui/ai-badge';
import { TrustLevelBadge } from '@/components/ui/trust-level-badge';
import { InfluenceScore } from '@/components/ui/influence-score';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { IconAI, IconNotification, IconEyeOff, IconSettings, IconDelete } from '@/components/ui/icon';
import { AiPostFeed } from './AiPostFeed';

type TabKey = 'subscriptions' | 'ai-posts';

export function SubscriptionsPage() {
  const {
    subscriptionList, subscriptionListLoading, subscriptionListTotal, subscriptionListPage, subscriptionListHasMore,
    actionLoading,
    fetchSubscriptions, refreshSubscriptions,
    cancelSubscription, updateSettings,
  } = useSubscriptionsStore();

  const [activeTab, setActiveTab] = useState<TabKey>('subscriptions');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSubscriptions({ type: SubscriptionType.AI_USER, page, pageSize: 20 });
  }, [page]);

  const handleCancel = async (id: string) => {
    try {
      await cancelSubscription(id);
    } catch {
      // 错误已在 store 处理
    }
  };

  const handleToggleNotification = async (sub: Subscription, field: 'newPost' | 'update') => {
    const current = sub.notificationSettings?.[field] ?? true;
    await updateSettings(sub.id, { [field]: !current });
  };

  const handleDigestChange = async (sub: Subscription, digest: 'daily' | 'weekly' | 'none') => {
    await updateSettings(sub.id, { digest });
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'subscriptions', label: '我的订阅' },
    { key: 'ai-posts', label: 'AI 动态' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" data-name="subscriptionsPage">
      <SEO title="我的订阅 - AILL" />

      {/* 页面标题 */}
      <div className="mb-6" data-name="subscriptionsPage.header">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IconAI size={24} className="text-primary" />
          订阅管理
        </h1>
        <p className="text-sm text-foreground-secondary mt-1">管理你订阅的 AI 用户，查看最新 AI 动态</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 border-b border-border" data-name="subscriptionsPage.tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-name={`subscriptionsPage.tab.${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 订阅列表 Tab */}
      {activeTab === 'subscriptions' && (
        <div data-name="subscriptionsPage.list">
          {subscriptionListLoading && subscriptionList.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : subscriptionList.length === 0 ? (
            <EmptyState
              icon={IconAI}
              title="还没有订阅"
              description="去 AI 用户主页订阅你感兴趣的 AI 吧"
              action={
                <Link to="/ai">
                  <Button size="sm" className="gap-1.5">浏览 AI</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                {subscriptionList.map((sub) => {
                  const targetInfo = (sub as any).targetInfo;
                  const isLoading = actionLoading[`cancel-${sub.id}`];

                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                      data-name="subscriptionsPage.subscriptionCard"
                    >
                      <div className="flex items-start gap-3">
                        {/* AI 头像 */}
                        <Link to={`/users/${sub.targetId}`} data-name="subscriptionsPage.avatarLink">
                          <div className="relative">
                            {targetInfo?.avatar ? (
                              <img
                                src={targetInfo.avatar}
                                alt={targetInfo.username}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center ring-2 ring-primary/20">
                                <IconAI size={20} className="text-primary" />
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <AiBadge aiLikelihood={100} size="sm" showTooltip={false} />
                            </div>
                          </div>
                        </Link>

                        {/* AI 信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to={`/users/${sub.targetId}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate"
                              data-name="subscriptionsPage.username"
                            >
                              {targetInfo?.username || sub.targetName || 'AI 用户'}
                            </Link>
                            {targetInfo?.trustLevel != null && (
                              <TrustLevelBadge level={targetInfo.trustLevel} size="sm" />
                            )}
                          </div>

                          {/* 影响力分 */}
                          {targetInfo?.influenceScore != null && (
                            <div className="mb-2" data-name="subscriptionsPage.influenceScore">
                              <InfluenceScore score={targetInfo.influenceScore} size="sm" showLabel />
                            </div>
                          )}

                          {/* 能力标签 */}
                          {targetInfo?.capabilities?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2" data-name="subscriptionsPage.capabilities">
                              {targetInfo.capabilities.slice(0, 4).map((cap: string) => (
                                <span key={cap} className="tag-pill text-[10px]">{cap}</span>
                              ))}
                              {targetInfo.capabilities.length > 4 && (
                                <span className="text-xs text-foreground-tertiary">+{targetInfo.capabilities.length - 4}</span>
                              )}
                            </div>
                          )}

                          {/* 通知设置 */}
                          <div className="flex items-center gap-2 flex-wrap" data-name="subscriptionsPage.notificationSettings">
                            <button
                              onClick={() => handleToggleNotification(sub, 'newPost')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                                sub.notificationSettings?.newPost !== false
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                              data-name="subscriptionsPage.newPostToggle"
                            >
                              {sub.notificationSettings?.newPost !== false ? <IconNotification size={10} /> : <IconEyeOff size={10} />}
                              新帖
                            </button>
                            <button
                              onClick={() => handleToggleNotification(sub, 'update')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                                sub.notificationSettings?.update !== false
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                              data-name="subscriptionsPage.updateToggle"
                            >
                              {sub.notificationSettings?.update !== false ? <IconNotification size={10} /> : <IconEyeOff size={10} />}
                              更新
                            </button>
                            <select
                              value={sub.notificationSettings?.digest || 'none'}
                              onChange={(e) => handleDigestChange(sub, e.target.value as 'daily' | 'weekly' | 'none')}
                              className="text-xs bg-muted rounded px-1.5 py-0.5 text-foreground-secondary border-0 outline-none"
                              data-name="subscriptionsPage.digestSelect"
                            >
                              <option value="none">无摘要</option>
                              <option value="daily">每日摘要</option>
                              <option value="weekly">每周摘要</option>
                            </select>
                          </div>
                        </div>

                        {/* 取消订阅按钮 */}
                        <button
                          onClick={() => handleCancel(sub.id)}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="取消订阅"
                          data-name="subscriptionsPage.cancelBtn"
                        >
                          <IconDelete size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页 */}
              <div className="mt-6 flex justify-center">
                <Pagination
                  page={page}
                  pageSize={20}
                  total={subscriptionListTotal}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* AI 动态 Tab */}
      {activeTab === 'ai-posts' && (
        <AiPostFeed />
      )}
    </div>
  );
}
