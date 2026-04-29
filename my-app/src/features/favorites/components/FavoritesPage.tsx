import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { favoriteApi, type FavoriteFolder, type FavoriteItem } from '../api';
import { IconBookmark, IconBookOpen, IconPlus, IconDelete, IconChevronLeft, IconUser } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function FavoritesPage() {
  const { user } = useAuthStore();
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchFolders = useCallback(async () => {
    if (!user) return;
    try { const list = await favoriteApi.getFolders(user.id); setFolders(list || []); } catch {}
  }, [user]);

  const fetchFavorites = useCallback(async (folderId: string | null, p = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await favoriteApi.getFavorites(user.id, { ...(folderId ? { folderId } : {}), page: p, limit: 20 });
      setFavorites(prev => p === 1 ? (res.list || []) : [...prev, ...(res.list || [])]);
      setHasMore(res.hasMore || false);
      setPage(p);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchFavorites(activeFolder, 1); }, [activeFolder]);

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try { await favoriteApi.createFolder(user.id, { name: newFolderName.trim() }); setNewFolderName(''); setShowNewFolder(false); fetchFolders(); } catch {}
  };

  const handleRemove = async (targetId: string) => {
    if (!user) return;
    try { await favoriteApi.removeFavorite(user.id, targetId); setFavorites(prev => prev.filter(f => f.targetId !== targetId)); } catch {}
  };

  return (
    <div className="py-4" data-name="favorites">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" data-name="favoritesHeader">
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-foreground-tertiary hover:text-foreground transition-colors text-sm" data-name="favoritesBackBtn">
          <IconChevronLeft size={16} /> 返回
        </button>
        <div className="sectionHeaderBar" style={{ background: 'hsl(28,90%,50%)' }} />
        <h1 className="text-lg font-bold text-foreground" data-name="favoritesTitle">我的收藏</h1>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)} className="gap-1 text-xs h-7" data-name="favoritesNewFolderBtn">
            <IconPlus size={12} /> 新建收藏夹
          </Button>
        </div>
      </div>

      {showNewFolder && (
        <div className="flex gap-2 mb-4" data-name="favoritesNewFolderForm">
          <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            placeholder="收藏夹名称"
            className="flex-1 rounded-lg border border-border/60 bg-background-elevated px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary/60 focus:border-[hsl(28,90%,50%)]/40 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
            data-name="favoritesNewFolderInput"
          />
          <Button size="sm" onClick={handleCreateFolder} className="btnWarm border-0" data-name="favoritesCreateFolderBtn">创建</Button>
        </div>
      )}

      {/* Folder tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" data-name="favoritesFolderTabs">
        <button onClick={() => setActiveFolder(null)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !activeFolder ? 'text-white' : 'text-foreground-secondary hover:text-foreground bg-muted/40'
          }`}
          style={!activeFolder ? { background: 'hsl(28,90%,50%)' } : undefined}
          data-name="favoritesAllFolderTab">
          全部
        </button>
        {folders.map(f => (
          <button key={f.id} onClick={() => setActiveFolder(f.id)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFolder === f.id ? 'text-white' : 'text-foreground-secondary hover:text-foreground bg-muted/40'
            }`}
            style={activeFolder === f.id ? { background: 'hsl(28,90%,50%)' } : undefined}
            data-name={`favoritesFolderTab${f.id}`}>
            <IconBookOpen size={12} /> {f.name}
          </button>
        ))}
      </div>

      {loading && !favorites.length ? (
        <div data-name="favoritesLoading"><PageSkeleton /></div>
      ) : !favorites.length ? (
        <div className="surfacePanel p-16 text-center text-foreground-tertiary" data-name="favoritesEmptyState">
          <IconBookmark size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无收藏</p>
        </div>
      ) : (
        <div className="space-y-2" data-name="favoritesList">
          {favorites.map(item => (
            <div key={item.id} className="surfacePanel group flex items-start gap-3 p-3.5 hover:border-border-hover" data-name={`favoritesItem${item.id}`}>
              <Link to={item.targetType === 1 ? `/posts/${item.targetId}` : item.targetType === 2 ? `/collections/${item.targetId}` : `/users/${item.targetId}`} className="flex-1 min-w-0" data-name={`favoritesItem${item.id}Link`}>
                <div className="flex items-start gap-3" data-name={`favoritesItem${item.id}Content`}>
                  {/* Cover image for posts */}
                  {item.target?.coverImage && (
                    <div className="hidden sm:block w-16 h-12 rounded-md overflow-hidden shrink-0 bg-muted" data-name={`favoritesItem${item.id}Cover`}>
                      <img src={item.target.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0" data-name={`favoritesItem${item.id}Info`}>
                    <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-primary transition-colors" data-name={`favoritesItem${item.id}TitleRow`}>
                      {item.targetType === 1 && <IconBookOpen size={14} className="shrink-0" />}
                      {item.targetType === 2 && <IconBookOpen size={14} className="shrink-0" />}
                      {item.targetType === 3 && <IconUser size={14} className="shrink-0" />}
                      <span className="truncate text-xs font-medium" data-name={`favoritesItem${item.id}Title`}>
                        {item.target?.title || item.target?.name || item.target?.username || `${item.targetTypeName} ${item.targetId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-foreground-tertiary mt-1.5" data-name={`favoritesItem${item.id}Meta`}>
                      <span className="tagPill text-[10px]" data-name={`favoritesItem${item.id}Type`}>{item.targetTypeName}</span>
                      <span className="ml-auto" data-name={`favoritesItem${item.id}Date`}>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
              <button onClick={() => handleRemove(item.targetId)}
                className="shrink-0 text-foreground-tertiary hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                data-name={`favoritesItem${item.id}RemoveBtn`}>
                <IconDelete size={14} />
              </button>
            </div>
          ))}
          {hasMore && (
            <button onClick={() => fetchFavorites(activeFolder, page + 1)} disabled={loading}
              className="w-full py-2.5 rounded-lg border border-border/60 text-xs text-foreground-secondary hover:text-foreground hover:border-border transition-colors"
              data-name="favoritesLoadMoreBtn">
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
