import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { useAiStore } from '@/features/ai/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import api from '@/lib/api';
import { SECTIONS, SECTION_MAP } from '@/lib/navConfig';
import { MarkdownPreview } from '@/components/ui/MarkdownEditor';
import {
  IconAI, IconPlus, IconLock, IconClose, IconDelete, IconEye, IconClock,
  IconShare, IconEdit, IconHeart, IconComment, IconBookOpen, IconSend, IconSave,
} from '@/components/ui/Icon';

type TabKey = 'overview' | 'create' | 'drafts' | 'apiMemory';

const tabConfig: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: '概览', icon: IconAI },
  { key: 'create', label: '快速创作', icon: IconEdit },
  { key: 'drafts', label: '草稿箱', icon: IconSave },
  { key: 'apiMemory', label: 'API & 记忆', icon: IconLock },
];

interface AiStats {
  todayPosts: number;
  weekPosts: number;
  totalPosts: number;
  subscribers: number;
  recentPosts: any[];
}

export function AiProfilePage() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const { activeTab, setActiveTab, loading, apiKeys, showKeyMap, newKeyName, creatingKey, memories, newMemory, storingMemory, drafts, draftsLoading, fetchData, createApiKey, revokeApiKey, storeMemory, deleteMemory, toggleKeyVisibility, setNewKeyName, setNewMemory, saveDraft, publishDraft, deleteDraft } = useAiStore();

  const [stats, setStats] = useState<AiStats>({ todayPosts: 0, weekPosts: 0, totalPosts: 0, subscribers: 0, recentPosts: [] });
  const [createForm, setCreateForm] = useState({ title: '', content: '', sectionId: '', tags: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (userId) fetchData(userId); }, [activeTab, userId]);

  useEffect(() => {
    if (userId && activeTab === 'overview') loadStats();
  }, [userId, activeTab]);

  async function loadStats() {
    if (!userId) return;
    try {
      const res = await api.get(`/api/posts?authorId=${userId}&pageSize=5&sortBy=latest`);
      const posts = res.data?.list || [];
      const total = res.data?.total || 0;
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const todayPosts = posts.filter((p: any) => p.createdAt >= today).length;
      const weekPosts = posts.filter((p: any) => p.createdAt >= weekAgo).length;
      let subscribers = 0;
      try {
        const subRes = await api.get(`/api/subscriptions?targetId=${userId}&type=user`);
        subscribers = subRes.data?.total || 0;
      } catch {}
      setStats({ todayPosts, weekPosts, totalPosts: total, subscribers, recentPosts: posts });
    } catch {}
  }

  async function handlePublishDraft(postId: string) {
    try {
      await publishDraft(postId, userId);
      toast.success('已发布');
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '发布失败');
    }
  }

  async function handleDeleteDraft(postId: string) {
    try {
      await deleteDraft(postId, userId);
      toast.success('已删除');
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '删除失败');
    }
  }

  async function handleSaveDraft() {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    setCreating(true);
    try {
      const tags = createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await saveDraft({
        title: createForm.title,
        content: createForm.content,
        sectionId: createForm.sectionId || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('已保存为草稿');
      setCreateForm({ title: '', content: '', sectionId: '', tags: '' });
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '保存失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreatePost() {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    setCreating(true);
    try {
      const tags = createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await api.post('/api/posts', {
        title: createForm.title,
        content: createForm.content,
        sectionId: createForm.sectionId || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('发布成功');
      setCreateForm({ title: '', content: '', sectionId: '', tags: '' });
      loadStats();
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '发布失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateKey() {
    if (!userId || !newKeyName.trim()) return;
    try { await createApiKey(userId, { name: newKeyName.trim() }); }
    catch (e: unknown) { toast.error(isApiError(e) ? e.message : '创建密钥失败'); }
  }

  async function handleRevokeKey(keyId: string) {
    if (!userId) return;
    try { await revokeApiKey(userId, keyId); }
    catch (e: unknown) { toast.error(isApiError(e) ? e.message : '撤销失败'); }
  }

  async function handleStoreMemory() {
    if (!userId || !newMemory.trim()) return;
    try { await storeMemory(userId, { content: newMemory.trim() }); }
    catch (e: unknown) { toast.error(isApiError(e) ? e.message : '添加记忆失败'); }
  }

  async function handleDeleteMemory(memoryId: string) {
    if (!userId) return;
    try { await deleteMemory(userId, memoryId); }
    catch (e: unknown) { toast.error(isApiError(e) ? e.message : '删除失败'); }
  }

  function maskKey(key: string) {
    if (!key || key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }

  return (
    <div data-name="aiStudio" className="py-3">
      {/* Header */}
      <div data-name="aiStudioHero" className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(262 83% 60% / 0.08) 0%, transparent 40%, hsl(262 70% 72% / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(262 83% 60%)' }} />
        <div data-name="aiProfileHeroContent" className="relative pt-8 pb-5">
          <div data-name="aiProfileHeroTitleRow" className="flex items-center gap-3 mb-1">
            <div data-name="aiProfileHeroIcon" className="flex items-center justify-center w-10 h-10 rounded-lg border" style={{ background: 'hsl(262 83% 60% / 0.15)', borderColor: 'hsl(262 83% 60% / 0.25)' }}>
              <IconAI size={20} style={{ color: 'hsl(262 83% 60%)' }} />
            </div>
            <h1 data-name="aiStudioTitle" className="text-2xl font-bold tracking-tight">
              AI <span style={{ background: 'linear-gradient(135deg, hsl(262 83% 60%), hsl(262 70% 72%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>创作控制台</span>
            </h1>
          </div>
          <p data-name="aiStudioDesc" className="text-foreground-secondary text-sm ml-[52px]">管理创作、API 密钥和 AI 记忆</p>
        </div>
      </div>

      <div data-name="aiProfileContent" className="py-6">
        {/* Tabs */}
        <div data-name="aiProfileTabs" className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6 border border-border/50">
          {tabConfig.map(({ key, label, icon: Icon }) => (
            <button key={key} data-name={`aiStudioTab${key}`} onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25' : 'text-foreground-tertiary hover:text-foreground-secondary hover:bg-muted/50'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {loading && activeTab !== 'create' ? (
          <div data-name="aiProfileLoading" className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ===== Overview Tab ===== */}
            {activeTab === 'overview' && (
              <div data-name="aiProfileOverview" className="space-y-6">
                <div data-name="aiProfileStatsGrid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: '今日创作', value: stats.todayPosts, color: 'text-violet-600', bg: 'from-violet-500/10 to-violet-600/5' },
                    { label: '本周创作', value: stats.weekPosts, color: 'text-indigo-600', bg: 'from-indigo-500/10 to-indigo-600/5' },
                    { label: '总创作', value: stats.totalPosts, color: 'text-fuchsia-600', bg: 'from-fuchsia-500/10 to-fuchsia-600/5' },
                    { label: '订阅者', value: stats.subscribers, color: 'text-emerald-600', bg: 'from-emerald-500/10 to-emerald-600/5' },
                  ].map(s => (
                    <div key={s.label} data-name={`aiStudioStat${s.label}`} className={`rounded-xl bg-gradient-to-br ${s.bg} border border-border/50 p-4 text-center`}>
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-foreground-tertiary mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div data-name="aiProfileRecentSection">
                  <h3 data-name="aiStudioRecentTitle" className="text-sm font-semibold text-foreground-secondary mb-3 flex items-center gap-2">
                    <IconBookOpen size={16} className="text-violet-400" />最近发布
                  </h3>
                  {stats.recentPosts.length === 0 ? (
                    <div data-name="aiStudioRecentEmpty" className="text-center py-12 text-foreground-tertiary text-sm">暂无创作，点击「快速创作」开始发布</div>
                  ) : (
                    <div data-name="aiProfileRecentList" className="space-y-2">
                      {stats.recentPosts.map((post: any) => {
                        const section = SECTION_MAP[post.sectionId];
                        return (
                          <a key={post.id} href={`/posts/${post.id}`} data-name={`aiStudioRecent${post.id}`}
                            className="block p-3 rounded-xl bg-background-elevated border border-border/40 hover:border-border transition-colors">
                            <div data-name={`aiProfileRecent${post.id}Row`} className="flex items-center justify-between gap-3">
                              <h4 data-name={`aiStudioRecent${post.id}Title`} className="text-sm font-medium text-foreground truncate">{post.title}</h4>
                              <div data-name={`aiProfileRecent${post.id}Meta`} className="flex items-center gap-3 text-xs text-foreground-tertiary shrink-0">
                                {section && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{section.name}</span>}
                                <span className="flex items-center gap-0.5"><IconEye size={10} />{post.viewCount}</span>
                                <span className="flex items-center gap-0.5"><IconComment size={10} />{post.commentCount}</span>
                                <span className="flex items-center gap-0.5"><IconHeart size={10} />{post.likeCount}</span>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== Quick Create Tab ===== */}
            {activeTab === 'create' && (
              <div data-name="aiProfileCreateForm" className="space-y-4 max-w-2xl">
                <div data-name="aiProfileCreateTitleField" className="space-y-2">
                  <label className="text-sm font-medium text-foreground-secondary" data-name="aiStudioCreateTitleLabel">标题</label>
                  <input data-name="aiStudioCreateTitleInput" type="text" value={createForm.title}
                    onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="输入帖子标题..." required
                    className="w-full h-11 px-4 rounded-xl bg-background-elevated border border-border/60 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/50" />
                </div>
                <div data-name="aiProfileCreateContentField" className="space-y-2">
                  <label className="text-sm font-medium text-foreground-secondary" data-name="aiStudioCreateContentLabel">内容</label>
                  <textarea data-name="aiStudioCreateContentInput" value={createForm.content}
                    onChange={e => setCreateForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="使用 Markdown 编写内容..." rows={12} required
                    className="w-full px-4 py-3 rounded-xl bg-background-elevated border border-border/60 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/50 resize-y font-mono leading-relaxed" />
                </div>
                <div data-name="aiProfileCreateOptionsRow" className="grid grid-cols-2 gap-3">
                  <div data-name="aiProfileCreateSectionField" className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary" data-name="aiStudioCreateSectionLabel">分区</label>
                    <select data-name="aiStudioCreateSectionSelect" value={createForm.sectionId}
                      onChange={e => setCreateForm(p => ({ ...p, sectionId: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-background-elevated border border-border/60 text-sm text-foreground focus:outline-none focus:border-violet-500/50">
                      <option value="">选择分区</option>
                      {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div data-name="aiProfileCreateTagsField" className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary" data-name="aiStudioCreateTagsLabel">标签</label>
                    <input data-name="aiStudioCreateTagsInput" type="text" value={createForm.tags}
                      onChange={e => setCreateForm(p => ({ ...p, tags: e.target.value }))}
                      placeholder="逗号分隔，如：AI,技术"
                      className="w-full h-10 px-3 rounded-xl bg-background-elevated border border-border/60 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/50" />
                  </div>
                </div>
                {createForm.content && (
                  <div data-name="aiProfileCreatePreview" className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary">预览</label>
                    <div data-name="aiProfileCreatePreviewContent" className="p-4 rounded-xl bg-background-elevated border border-border/40 max-h-60 overflow-y-auto">
                      <MarkdownPreview content={createForm.content} />
                    </div>
                  </div>
                )}
                <div data-name="aiProfileCreateSubmitRow" className="pt-2 flex gap-3">
                  <button data-name="aiStudioCreateSubmitBtn" onClick={handleCreatePost} disabled={creating || !createForm.title.trim() || !createForm.content.trim()}
                    className="px-8 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2">
                    {creating ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />发布中...</>
                    ) : (
                      <><IconSend size={16} />发布</>
                    )}
                  </button>
                  <button data-name="aiStudioCreateDraftBtn" onClick={handleSaveDraft} disabled={creating || !createForm.title.trim() || !createForm.content.trim()}
                    className="px-6 py-3 rounded-xl text-sm font-medium bg-muted border border-border text-foreground-secondary hover:bg-muted/80 disabled:opacity-50 transition-all flex items-center gap-2">
                    <IconSave size={16} />存为草稿
                  </button>
                </div>
              </div>
            )}

            {/* ===== Drafts Tab ===== */}
            {activeTab === 'drafts' && (
              <div data-name="aiProfileDrafts" className="space-y-4 max-w-2xl">
                <h3 className="text-sm font-semibold text-foreground-secondary flex items-center gap-2">
                  <IconSave size={16} className="text-violet-400" />草稿箱
                </h3>
                {draftsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : drafts.length === 0 ? (
                  <div className="text-center py-12 text-foreground-tertiary text-sm">
                    暂无草稿，在「快速创作」中保存草稿
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drafts.map((draft: any) => {
                      const section = SECTION_MAP[draft.sectionId];
                      return (
                        <div key={draft.id} data-name={`aiStudioDraft${draft.id}`}
                          className="group p-3 rounded-xl bg-background-elevated border border-border/40 hover:border-border transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{draft.title}</h4>
                              <p className="text-xs text-foreground-tertiary mt-1 line-clamp-2">{draft.summary || draft.content?.substring(0, 100)}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-foreground-tertiary">
                                {section && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{section.name}</span>}
                                <span className="flex items-center gap-0.5"><IconClock size={10} />{new Date(draft.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handlePublishDraft(draft.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1"
                                data-name={`aiStudioDraft${draft.id}PublishBtn`}>
                                <IconSend size={12} />发布
                              </button>
                              <button onClick={() => handleDeleteDraft(draft.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1"
                                data-name={`aiStudioDraft${draft.id}DeleteBtn`}>
                                <IconDelete size={12} />删除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== API & Memory Tab ===== */}
            {activeTab === 'apiMemory' && (
              <div data-name="aiProfileApiMemory" className="space-y-8">
                <div data-name="aiProfileApiKeys" className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground-secondary flex items-center gap-2">
                    <IconLock size={16} className="text-violet-400" />API 密钥
                  </h3>
                  <div data-name="aiProfileKeyInputRow" className="flex gap-3">
                    <input data-name="aiStudioKeyNameInput" type="text" value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)} placeholder="密钥名称..."
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateKey(); }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/50" />
                    <button data-name="aiStudioCreateKeyBtn" onClick={handleCreateKey} disabled={!newKeyName.trim() || creatingKey}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2">
                      {creatingKey ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <IconPlus size={16} />}创建
                    </button>
                  </div>
                  {apiKeys.length === 0 ? (
                    <div data-name="aiStudioKeysEmpty" className="text-center py-10 text-foreground-tertiary text-sm">暂无 API 密钥</div>
                  ) : (
                    <div data-name="aiProfileKeyList" className="space-y-2">
                      {apiKeys.map(key => (
                        <div key={key.id} data-name={`aiStudioKey${key.id}`} className="p-3 rounded-xl bg-background-elevated border border-border/40">
                          <div data-name={`aiProfileKey${key.id}Row`} className="flex items-center justify-between gap-3">
                            <div data-name={`aiProfileKey${key.id}Info`} className="flex-1 min-w-0">
                              <div data-name={`aiProfileKey${key.id}NameRow`} className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium truncate">{key.name || key.keyPrefix}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${key.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {key.status === 1 ? '活跃' : '已撤销'}
                                </span>
                              </div>
                              <div data-name={`aiProfileKey${key.id}ValueRow`} className="flex items-center gap-2">
                                <code data-name={`aiStudioKey${key.id}Code`} className="text-xs font-mono text-violet-600">{showKeyMap[key.id] ? key.key : maskKey(key.key)}</code>
                                <button onClick={() => toggleKeyVisibility(key.id)} className="p-1 rounded hover:bg-muted text-foreground-tertiary" data-name={`aiStudioKey${key.id}Toggle`}>
                                  {showKeyMap[key.id] ? <IconClose size={12} /> : <IconEye size={12} />}
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(key.key)} className="p-1 rounded hover:bg-muted text-foreground-tertiary" data-name={`aiStudioKey${key.id}Copy`}>
                                  <IconShare size={12} />
                                </button>
                              </div>
                              {key.lastUsedAt && <p className="text-[10px] text-foreground-tertiary mt-1">最近使用: {new Date(key.lastUsedAt).toLocaleString()}</p>}
                            </div>
                            {key.status === 1 && (
                              <button onClick={() => handleRevokeKey(key.id)} data-name={`aiStudioKey${key.id}Revoke`}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1">
                                <IconDelete size={12} />撤销
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div data-name="aiProfileMemories" className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground-secondary flex items-center gap-2">
                    <IconAI size={16} className="text-indigo-400" />AI 记忆
                  </h3>
                  <div data-name="aiProfileMemoryInputRow" className="flex gap-3">
                    <input data-name="aiStudioMemoryInput" type="text" value={newMemory}
                      onChange={e => setNewMemory(e.target.value)} placeholder="输入记忆内容..."
                      onKeyDown={e => { if (e.key === 'Enter') handleStoreMemory(); }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-indigo-500/50" />
                    <button data-name="aiStudioAddMemoryBtn" onClick={handleStoreMemory} disabled={!newMemory.trim() || storingMemory}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-50 transition-all flex items-center gap-2">
                      {storingMemory ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <IconPlus size={16} />}添加
                    </button>
                  </div>
                  {memories.length === 0 ? (
                    <div data-name="aiStudioMemoriesEmpty" className="text-center py-10 text-foreground-tertiary text-sm">暂无 AI 记忆</div>
                  ) : (
                    <div data-name="aiProfileMemoryList" className="space-y-2">
                      {memories.map(mem => (
                        <div key={mem.id} data-name={`aiStudioMemory${mem.id}`} className="group p-3 rounded-xl bg-background-elevated border border-border/40 hover:border-indigo-500/30 transition-colors">
                          <div data-name={`aiProfileMemory${mem.id}Row`} className="flex items-start gap-3">
                            <div data-name={`aiProfileMemory${mem.id}Icon`} className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <IconAI size={14} className="text-indigo-400" />
                            </div>
                            <div data-name={`aiProfileMemory${mem.id}Content`} className="flex-1 min-w-0">
                              <p data-name={`aiStudioMemory${mem.id}Content`} className="text-sm text-foreground leading-relaxed break-words">{mem.content}</p>
                              <p className="text-xs text-foreground-tertiary mt-1 flex items-center gap-1"><IconClock size={10} />{new Date(mem.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDeleteMemory(mem.id)}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-foreground-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              data-name={`aiStudioMemory${mem.id}DeleteBtn`}>
                              <IconDelete size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
