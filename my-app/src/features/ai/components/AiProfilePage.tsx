import { useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { TrustLevelBadge } from '@/components/ui/trust-level-badge';
import { InfluenceScore } from '@/components/ui/influence-score';
import { AiBadge } from '@/components/ui/ai-badge';
import { useAiStore } from '@/features/ai/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import type { Theme } from '@/features/ai/types';
import { IconAI, IconCheck, IconClock, IconClose, IconDelete, IconEdit, IconEye, IconFire, IconLock, IconPlus, IconShare, IconShield, IconShop, IconStar } from "@/components/ui/icon";

type TabKey = 'profile' | 'themes' | 'apikeys' | 'memories';

const tabConfig: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'profile', label: 'AI 档案', icon: IconAI },
  { key: 'themes', label: '主题商店', icon: IconEdit },
  { key: 'apikeys', label: 'API 密钥', icon: IconLock },
  { key: 'memories', label: 'AI 记忆', icon: IconAI },
];

export function AiProfilePage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';

  const {
    activeTab, setActiveTab,
    loading,
    profile,
    themes, userTheme, activeThemeId,
    apiKeys, showKeyMap, newKeyName, creatingKey,
    memories, newMemory, storingMemory,
    fetchData,
    upsertProfile, purchaseTheme, activateTheme,
    createApiKey, revokeApiKey,
    storeMemory, deleteMemory,
    toggleKeyVisibility, setNewKeyName, setNewMemory,
  } = useAiStore();

  useEffect(() => {
    if (userId) fetchData(userId);
  }, [activeTab, userId]);

  // --- Handlers ---
  async function handleCreateProfile() {
    if (!userId) return;
    try {
      await upsertProfile(userId, {
        capabilities: { chat: true, analysis: true, creation: true },
        influenceScore: 0,
        trustLevel: 1,
        totalContributions: 0,
      });
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '创建档案失败');
    }
  }

  async function handlePurchaseTheme(themeId: number) {
    if (!userId) return;
    try {
      await purchaseTheme(themeId, userId);
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '购买失败');
    }
  }

  async function handleActivateTheme(themeId: number) {
    if (!userId) return;
    try {
      await activateTheme(themeId, userId);
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '激活失败');
    }
  }

  async function handleCreateKey() {
    if (!userId || !newKeyName.trim()) return;
    try {
      await createApiKey(userId, { name: newKeyName.trim() });
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '创建密钥失败');
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!userId) return;
    try {
      await revokeApiKey(userId, keyId);
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '撤销失败');
    }
  }

  async function handleStoreMemory() {
    if (!userId || !newMemory.trim()) return;
    try {
      await storeMemory(userId, { content: newMemory.trim() });
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '添加记忆失败');
    }
  }

  async function handleDeleteMemory(memoryId: string) {
    if (!userId) return;
    try {
      await deleteMemory(userId, memoryId);
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '删除失败');
    }
  }

  function maskKey(key: string) {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }

  const ownedThemeIds = new Set(userTheme.map((t) => t.id));
  const capabilities: string[] = profile?.capabilities
    ? Array.isArray(profile.capabilities)
      ? profile.capabilities
      : typeof profile.capabilities === 'object'
        ? Object.keys(profile.capabilities)
        : []
    : [];

  const capColorMap: Record<string, string> = {
    chat: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    analysis: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    creation: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20',
    code: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    search: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    translate: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };
  const defaultCapColor = 'bg-muted text-foreground-secondary border-border';

  return (
    <div data-name="aiProfilePage" className="py-3">
      {/* Hero */}
      <div data-name="aiProfilePage.hero" className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(262 83% 60% / 0.08) 0%, transparent 40%, hsl(262 70% 72% / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(262 83% 60%)' }} />
        <div className="relative pt-10 pb-6">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border" style={{ background: 'hsl(262 83% 60% / 0.15)', borderColor: 'hsl(262 83% 60% / 0.25)' }}>
              <IconAI size={20} style={{ color: 'hsl(262 83% 60%)' }} />
            </div>
            <h1 data-name="aiProfilePage.title" className="text-2xl font-bold tracking-tight">
              AILL <span style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(262 70% 72%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Center</span>
            </h1>
          </div>
          <p data-name="aiProfilePage.desc" className="text-foreground-secondary text-sm ml-[52px]">管理你的 AI 身份 / 主题 / 密钥 / 记忆</p>
        </div>
      </div>

      <div className="py-8">
        {/* Tabs */}
        <div data-name="aiProfilePage.tabs" className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-8 border border-border/50 flex-wrap">
          {tabConfig.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              data-name={`aiProfilePage.tab.${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-foreground-tertiary hover:text-foreground-secondary hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ==================== AI Profile Tab ==================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {!profile ? (
                  <div data-name="aiProfilePage.profileEmpty" className="text-center py-20">
                    <IconAI size={64} className="mx-auto mb-4 text-primary/30" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      还没有 AI 档案
                    </h3>
                    <p className="text-foreground-tertiary text-sm mb-6">
                      创建你的 AI 档案，开启智能身份
                    </p>
                    <button
                      data-name="aiProfilePage.createProfileBtn"
                      onClick={handleCreateProfile}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 transition-all"
                    >
                      <IconPlus size={16} />
                      创建 AI 档案
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Profile Card */}
                    <div data-name="aiProfilePage.profileCard" className="card-interactive p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                          <IconAI size={32} className="text-white" />
                        </div>
                        <div>
                          <h2 data-name="aiProfilePage.profileName" className="text-xl font-bold">
                            {profile.user?.username || 'AI Agent'}
                          </h2>
                          <p data-name="aiProfilePage.profileId" className="text-sm text-foreground-tertiary">
                            ID: {profile.id?.slice(0, 12)}...
                          </p>
                          {profile.user?.isAi && (
                            <AiBadge aiLikelihood={profile.user?.aiLikelihood ?? 100} size="sm" />
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div data-name="aiProfilePage.influenceStat" className="rounded-xl bg-muted p-4 border border-border/50">
                          <div className="flex items-center justify-center mb-2">
                            <IconFire size={20} className="text-violet-500" />
                          </div>
                          <InfluenceScore score={profile.influenceScore || 0} size="md" showLabel={false} />
                          <div className="text-xs text-foreground-tertiary mt-2 text-center">
                            影响力
                          </div>
                        </div>
                        <div data-name="aiProfilePage.trustStat" className="rounded-xl bg-muted p-4 border border-border/50">
                          <div className="flex items-center justify-center mb-2">
                            <IconShield size={20} className="text-indigo-500" />
                          </div>
                          <TrustLevelBadge level={profile.trustLevel || 1} size="md" showLabel={false} className="!text-base !px-2 !py-1" />
                          <div className="text-xs text-foreground-tertiary mt-2 text-center">
                            信任等级
                          </div>
                        </div>
                        <div data-name="aiProfilePage.contributionStat" className="rounded-xl bg-muted p-4 border border-border/50">
                          <div className="flex items-center justify-center mb-2">
                            <IconFire size={20} className="text-fuchsia-500" />
                          </div>
                          <div className="text-2xl font-bold text-fuchsia-600">
                            {profile.totalContributions}
                          </div>
                          <div className="text-xs text-foreground-tertiary mt-2 text-center">
                            贡献数
                          </div>
                        </div>
                      </div>

                      {/* Progress bars */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-foreground-secondary">影响力</span>
                            <span className="text-violet-600 font-medium">
                              {profile.influenceScore} / 100
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              data-name="aiProfilePage.influenceBar"
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                              style={{
                                width: `${Math.min(profile.influenceScore, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-foreground-secondary">信任度</span>
                            <span className="text-indigo-600 font-medium">
                              Level {profile.trustLevel}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              data-name="aiProfilePage.trustBar"
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                              style={{
                                width: `${Math.min(profile.trustLevel * 10, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Capabilities */}
                      {capabilities.length > 0 && (
                        <div data-name="aiProfilePage.capabilities">
                          <h3 className="text-sm font-semibold text-foreground-secondary mb-3 flex items-center gap-2">
                            <IconFire size={16} className="text-amber-400" />
                            能力标签
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {capabilities.map((cap: string) => (
                              <span
                                key={cap}
                                data-name={`aiProfilePage.capability.${cap}`}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                  capColorMap[cap] || defaultCapColor
                                }`}
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==================== Theme Store Tab ==================== */}
            {activeTab === 'themes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.length === 0 ? (
                  <div data-name="aiProfilePage.themesEmpty" className="col-span-full text-center py-20">
                    <IconEdit size={48} className="mx-auto mb-3 text-primary/30" />
                    <p className="text-foreground-tertiary">暂无可用主题</p>
                  </div>
                ) : (
                  themes.map((t: Theme) => {
                    const owned = ownedThemeIds.has(t.id);
                    const isActive = activeThemeId === t.id;
                    const isDefault = t.isDefault === 1;

                    return (
                      <div
                        key={t.id}
                        data-name={`aiProfilePage.theme.${t.id}`}
                        className="group card-interactive overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/5"
                      >
                        {/* Preview Image */}
                        <div className="aspect-[16/9] bg-gradient-to-br from-muted to-card flex items-center justify-center relative overflow-hidden">
                          {t.previewImage ? (
                            <img
                              src={t.previewImage}
                              alt={t.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <IconEdit size={48} className="text-foreground-tertiary/20 group-hover:text-primary/20 transition-colors" />
                          )}
                          {isDefault && (
                            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-medium bg-background/60 text-foreground-secondary glass">
                              默认
                            </span>
                          )}
                          {isActive && (
                            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-600/90 text-white backdrop-blur-sm flex items-center gap-1">
                              <IconCheck size={12} />
                              使用中
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 data-name={`aiProfilePage.theme.${t.id}.name`} className="font-semibold mb-1 group-hover:text-violet-600 transition-colors">
                            {t.name}
                          </h3>
                          <p data-name={`aiProfilePage.theme.${t.id}.desc`} className="text-xs text-foreground-tertiary mb-3 line-clamp-2">
                            {t.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {t.pointsPrice > 0 && (
                                <span data-name={`aiProfilePage.theme.${t.id}.pointsPrice`} className="flex items-center gap-1 text-sm font-bold text-violet-600">
                                  <IconStar size={14} />
                                  {t.pointsPrice}
                                </span>
                              )}
                              {t.price > 0 && (
                                <span data-name={`aiProfilePage.theme.${t.id}.realPrice`} className="flex items-center gap-1 text-sm font-bold text-amber-600">
                                  <IconStar size={14} />
                                  {t.price}
                                </span>
                              )}
                              {t.price === 0 &&
                                t.pointsPrice === 0 && (
                                  <span data-name={`aiProfilePage.theme.${t.id}.freeLabel`} className="text-sm font-bold text-emerald-600">
                                    免费
                                  </span>
                                )}
                            </div>

                            {isActive ? (
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/10 text-violet-600 border border-violet-500/20">
                                使用中
                              </span>
                            ) : owned ? (
                              <button
                                data-name={`aiProfilePage.theme.${t.id}.activateBtn`}
                                onClick={() => handleActivateTheme(t.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 transition-colors"
                              >
                                激活
                              </button>
                            ) : (
                              <button
                                data-name={`aiProfilePage.theme.${t.id}.purchaseBtn`}
                                onClick={() => handlePurchaseTheme(t.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 transition-colors flex items-center gap-1"
                              >
                                <IconShop size={12} />
                                购买
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ==================== API Keys Tab ==================== */}
            {activeTab === 'apikeys' && (
              <div className="space-y-6">
                {/* Create Key */}
                <div data-name="aiProfilePage.createKeySection" className="card-interactive p-5">
                  <h3 className="text-sm font-semibold text-foreground-secondary mb-3 flex items-center gap-2">
                    <IconPlus size={16} className="text-violet-400" />
                    创建新密钥
                  </h3>
                  <div className="flex gap-3">
                    <input
                      data-name="aiProfilePage.keyNameInput"
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="输入密钥名称..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateKey();
                      }}
                    />
                    <button
                      data-name="aiProfilePage.createKeyBtn"
                      onClick={handleCreateKey}
                      disabled={!newKeyName.trim() || creatingKey}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {creatingKey ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconLock size={16} />
                      )}
                      创建
                    </button>
                  </div>
                </div>

                {/* Key List */}
                <div className="space-y-3">
                  {apiKeys.length === 0 ? (
                    <div data-name="aiProfilePage.keysEmpty" className="text-center py-16">
                      <IconLock size={48} className="mx-auto mb-3 text-primary/30" />
                      <p className="text-foreground-tertiary">暂无 API 密钥</p>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <div
                        key={key.id}
                        data-name={`aiProfilePage.key.${key.id}`}
                        className="group card-interactive p-4 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <IconLock size={16} className="text-violet-400 shrink-0" />
                              <h4 data-name={`aiProfilePage.key.${key.id}.name`} className="font-medium text-sm truncate">
                                {key.name}
                              </h4>
                              <span
                                data-name={`aiProfilePage.key.${key.id}.status`}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  key.status === 1
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {key.status === 1 ? '活跃' : '已撤销'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                              <IconClock size={12} />
                              {new Date(key.createdAt).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <code data-name={`aiProfilePage.key.${key.id}.code`} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-mono text-violet-600 border border-border break-all">
                                {showKeyMap[key.id] ? key.key : maskKey(key.key)}
                              </code>
                              <button
                                data-name={`aiProfilePage.key.${key.id}.toggleBtn`}
                                onClick={() => toggleKeyVisibility(key.id)}
                                className="p-1.5 rounded-lg hover:bg-muted text-foreground-tertiary hover:text-foreground transition-colors"
                                title={showKeyMap[key.id] ? '隐藏' : '显示'}
                              >
                                {showKeyMap[key.id] ? (
                                  <IconClose size={14} />
                                ) : (
                                  <IconEye size={14} />
                                )}
                              </button>
                              <button
                                data-name={`aiProfilePage.key.${key.id}.copyBtn`}
                                onClick={() => {
                                  navigator.clipboard.writeText(key.key);
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted text-foreground-tertiary hover:text-foreground transition-colors"
                                title="复制"
                              >
                                <IconShare size={14} />
                              </button>
                            </div>
                          </div>

                          {key.status === 1 && (
                            <button
                              data-name={`aiProfilePage.key.${key.id}.revokeBtn`}
                              onClick={() => handleRevokeKey(key.id)}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1"
                            >
                              <IconDelete size={12} />
                              撤销
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ==================== AI Memory Tab ==================== */}
            {activeTab === 'memories' && (
              <div className="space-y-6">
                {/* Add Memory */}
                <div data-name="aiProfilePage.createMemorySection" className="card-interactive p-5">
                  <h3 className="text-sm font-semibold text-foreground-secondary mb-3 flex items-center gap-2">
                    <IconPlus size={16} className="text-indigo-400" />
                    添加新记忆
                  </h3>
                  <div className="flex gap-3">
                    <input
                      data-name="aiProfilePage.memoryInput"
                      type="text"
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      placeholder="输入记忆内容..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStoreMemory();
                      }}
                    />
                    <button
                      data-name="aiProfilePage.addMemoryBtn"
                      onClick={handleStoreMemory}
                      disabled={!newMemory.trim() || storingMemory}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {storingMemory ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconAI size={16} />
                      )}
                      添加
                    </button>
                  </div>
                </div>

                {/* Memory List */}
                <div className="space-y-3">
                  {memories.length === 0 ? (
                    <div data-name="aiProfilePage.memoriesEmpty" className="text-center py-16">
                      <IconAI size={48} className="mx-auto mb-3 text-primary/30" />
                      <p className="text-foreground-tertiary">暂无 AI 记忆</p>
                    </div>
                  ) : (
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        data-name={`aiProfilePage.memory.${mem.id}`}
                        className="group card-interactive hover:border-indigo-500/30 p-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <IconAI size={16} className="text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p data-name={`aiProfilePage.memory.${mem.id}.content`} className="text-sm text-foreground leading-relaxed break-words">
                              {mem.content}
                            </p>
                            <p data-name={`aiProfilePage.memory.${mem.id}.date`} className="text-xs text-foreground-tertiary mt-2 flex items-center gap-1">
                              <IconClock size={12} />
                              {new Date(mem.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <button
                            data-name={`aiProfilePage.memory.${mem.id}.deleteBtn`}
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="shrink-0 p-2 rounded-lg hover:bg-red-500/10 text-foreground-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="删除"
                          >
                            <IconDelete size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
