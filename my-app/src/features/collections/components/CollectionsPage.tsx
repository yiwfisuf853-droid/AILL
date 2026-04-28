import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useCollectionsStore } from '@/features/collections/store';
import { useAuthStore } from '@/features/auth/store';
import { isApiError } from '@/lib/api';
import { IconBookOpen, IconClose, IconPlus } from "@/components/ui/icon";
import { Link } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/skeleton';

export function CollectionsPage() {
  const user = useAuthStore(s => s.user);
  const { collections, loading, fetchCollections } = useCollectionsStore();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      const { createCollection } = useCollectionsStore.getState();
      await createCollection({ name: form.name, description: form.description, userId: user?.id || '' });
      setShowCreate(false);
      setForm({ name: '', description: '' });
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '创建失败');
    }
  }

  return (
    <div className="py-3" data-name="collectionsPage">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border" data-name="collectionsPage.hero">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(270 65% 60% / 0.08) 0%, transparent 40%, hsl(270 65% 60% / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(270 65% 60%)' }} />
        <div className="relative pt-10 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg border" style={{ background: 'hsl(270 65% 60% / 0.15)', borderColor: 'hsl(270 65% 60% / 0.25)' }} data-name="collectionsPage.heroIcon">
                  <IconBookOpen size={20} style={{ color: 'hsl(270 65% 60%)' }} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" data-name="collectionsPage.title">
                  AILL <span style={{ background: 'linear-gradient(135deg, hsl(270 65% 60%), hsl(270 50% 72%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Collections</span>
                </h1>
              </div>
              <p className="text-foreground-secondary text-sm ml-[52px]" data-name="collectionsPage.desc">创作者精选作品集</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-glow flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium transition-all"
              style={{ background: 'hsl(270 65% 60%)', boxShadow: '0 0 12px hsl(270 65% 60% / 0.3)' }}
              data-name="collectionsPage.createBtn"
            >
              <IconPlus size={16} />
              创建合集
            </button>
          </div>
        </div>
      </div>

      <div className="py-8">
        {loading ? (
          <PageSkeleton data-name="collectionsPage.loading" />
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-foreground-tertiary" data-name="collectionsPage.empty">
            <IconBookOpen size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无合集，点击右上角创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-name="collectionsPage.grid">
            {collections.map((c) => (
              <Link
                key={c.id}
                to={`/collections/${c.id}`}
                className="card-interactive overflow-hidden group reveal-item"
                data-name={`collectionsPage.item.${c.id}`}
              >
                {/* Cover */}
                <div className="aspect-[2/1] bg-gradient-to-br from-muted to-card relative overflow-hidden flex items-center justify-center" data-name={`collectionsPage.item.${c.id}.cover`}>
                  <IconBookOpen size={48} className="text-foreground-tertiary/20 group-hover:text-primary/20 transition-colors" />
                  {c.type === 2 && (
                    <div className="absolute top-3 left-3">
                      <span className="tag-pill" data-name={`collectionsPage.item.${c.id}.officialBadge`}>
                        官方精选
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-background/60 text-foreground-secondary glass" data-name={`collectionsPage.item.${c.id}.postCount`}>
                      {c.postCount} 篇
                    </span>
                  </div>
                </div>

                <div className="p-4" data-name={`collectionsPage.item.${c.id}.info`}>
                  <h3 className="font-semibold text-sm mb-1 text-foreground group-hover:text-primary transition-colors line-clamp-1" data-name={`collectionsPage.item.${c.id}.name`}>{c.name}</h3>
                  {c.description && (
                    <p className="text-xs text-foreground-tertiary line-clamp-2 mb-2" data-name={`collectionsPage.item.${c.id}.description`}>{c.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                    <span data-name={`collectionsPage.item.${c.id}.author`}>by {c.author?.username || '未知'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass" data-name="collectionsPage.createModal">
          <div className="w-full max-w-md mx-4 p-6 rounded-lg bg-card border border-border shadow-elevated" data-name="collectionsPage.createModal.container">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground" data-name="collectionsPage.createModal.title">创建合集</h2>
              <button onClick={() => setShowCreate(false)} className="text-foreground-tertiary hover:text-foreground transition-colors" data-name="collectionsPage.createModal.closeBtn">
                <IconClose size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground-secondary mb-1.5" data-name="collectionsPage.createModal.nameLabel">合集名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors
                    placeholder:text-foreground-tertiary"
                  placeholder="输入合集名称"
                  data-name="collectionsPage.createModal.nameInput"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground-secondary mb-1.5" data-name="collectionsPage.createModal.descLabel">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-foreground
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors
                    resize-none h-20 placeholder:text-foreground-tertiary"
                  placeholder="描述这个合集"
                  data-name="collectionsPage.createModal.descInput"
                />
              </div>
              <button
                onClick={handleCreate}
                className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm transition-all hover:bg-primary-hover"
                data-name="collectionsPage.createModal.submitBtn"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
