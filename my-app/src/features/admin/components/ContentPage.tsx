import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { IconFileText, IconSearch, IconCheck, IconClose, IconDelete } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type ContentSubTab = 'posts' | 'comments';

export function ContentPage() {
  const [subTab, setSubTab] = useState<ContentSubTab>('posts');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'posts') {
        const res: any = await adminApi.listPosts?.({ search: search || undefined });
        setItems(res?.list || res?.data || []);
      } else {
        const res: any = await adminApi.listComments?.({ search: search || undefined });
        setItems(res?.list || res?.data || []);
      }
    } catch { setItems([]); }
    setLoading(false);
  };

  const handleStatus = async (id: string, status: number) => {
    try {
      if (subTab === 'posts') await adminApi.updatePostStatus(id, { status });
      else await adminApi.updateCommentStatus(id, { status });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch {}
  };

  const statusLabel = (s: number) => ({ 1: '已发布', 0: '草稿', 2: '已下架', 3: '已删除' }[s] || '未知');
  const statusColor = (s: number) => ({
    1: 'bg-success/15 text-success-light',
    0: 'bg-warning/15 text-warning-light',
    2: 'bg-destructive/15 text-destructive-light',
    3: 'bg-foreground-tertiary/15 text-foreground-tertiary',
  }[s] || 'bg-foreground-tertiary/15 text-foreground-secondary');

  return (
    <div className="space-y-6" data-name="adminContent">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><IconFileText size={22} className="text-primary" /> 内容管理</h2>
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadData()} placeholder="搜索内容..." className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-foreground-tertiary focus:outline-none focus:border-primary/50 w-56 transition-colors" />
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {(['posts', 'comments'] as const).map(key => (
          <button key={key} onClick={() => setSubTab(key)} className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all', subTab === key ? 'bg-primary/80 text-white' : 'text-foreground-tertiary hover:text-foreground-secondary')}>
            {key === 'posts' ? '帖子' : '评论'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm line-clamp-1">{item.title || item.content?.substring(0, 60)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor(item.status)}`}>{statusLabel(item.status)}</span>
                  </div>
                  <p className="text-foreground-tertiary text-xs line-clamp-1">{item.content?.substring(0, 120)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-foreground-tertiary">
                    <span>作者: {item.authorName || item.username || '—'}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 1 && (
                    <button onClick={() => handleStatus(item.id, 2)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-warning/10 text-warning hover:bg-warning/20 transition-colors">下架</button>
                  )}
                  {item.status === 2 && (
                    <button onClick={() => handleStatus(item.id, 1)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors">恢复</button>
                  )}
                  {item.status !== 3 && (
                    <button onClick={() => handleStatus(item.id, 3)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">删除</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center py-16 text-foreground-tertiary">暂无内容</div>}
        </div>
      )}
    </div>
  );
}
