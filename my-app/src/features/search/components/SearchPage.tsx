import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSearchStore } from '../store';
import { useAuthStore } from '@/features/auth/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { IconSearch, IconClose, IconEye, IconHeart, IconComment, IconFilter } from '@/components/ui/Icon';
import { SECTIONS } from '@/lib/navConfig';
import { cn } from '@/lib/utils';
import { getThumbUrl } from '@/lib/imageUtils';

type SortBy = 'relevance' | 'latest' | 'hot';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, total, loading, search, clear } = useSearchStore();
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [sectionId, setSectionId] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  const doSearch = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return;
    await search({
      keyword: q.trim(),
      sectionId: sectionId || undefined,
      sortBy,
      page: p,
      pageSize,
    });
    setPage(p);
  }, [search, sectionId, sortBy]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setKeyword(q);
      doSearch(q);
    }
  }, [searchParams, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSearchParams({ q: keyword.trim() });
    doSearch(keyword, 1);
  };

  const handleClear = () => {
    setKeyword('');
    clear();
    setSearchParams({});
  };

  const handleSortChange = (s: SortBy) => {
    setSortBy(s);
    if (keyword.trim()) {
      search({
        keyword: keyword.trim(),
        sectionId: sectionId || undefined,
        sortBy: s,
        page: 1,
        pageSize,
      });
      setPage(1);
    }
  };

  const handleSectionChange = (s: string) => {
    setSectionId(s);
    if (keyword.trim()) {
      search({
        keyword: keyword.trim(),
        sectionId: s || undefined,
        sortBy,
        page: 1,
        pageSize,
      });
      setPage(1);
    }
  };

  const hasSearched = useSearchStore(s => s.currentKeyword) !== '';

  return (
    <div className="py-4" data-name="search">
      {/* 搜索栏 */}
      <form onSubmit={handleSubmit} className="mb-6" data-name="searchForm">
        <div className="relative">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子标题、内容..."
            data-name="searchInput"
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-muted/30 border border-border/60 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm transition-colors"
            autoFocus
          />
          {keyword && (
            <button type="button" onClick={handleClear} data-name="searchClearBtn" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <IconClose size={16} />
            </button>
          )}
        </div>
      </form>

      {/* 过滤与排序 */}
      {hasSearched && (
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap" data-name="searchFilters">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {loading ? '搜索中...' : `找到 ${total} 个结果`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 排序切换 */}
            <div className="flex gap-1 p-0.5 bg-muted/30 rounded-md" data-name="searchSortTabs">
              {(['relevance', 'latest', 'hot'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => handleSortChange(s)}
                  data-name={`searchSortTab${s}`}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    sortBy === s
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'relevance' ? '相关' : s === 'latest' ? '最新' : '最热'}
                </button>
              ))}
            </div>

            {/* 分区过滤 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              data-name="searchFilterToggleBtn"
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                sectionId ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              )}
            >
              <IconFilter size={12} />
              {sectionId ? SECTIONS.find(s => s.id === sectionId)?.name || '分区' : '分区'}
            </button>
          </div>
        </div>
      )}

      {/* 分区过滤面板 */}
      {showFilters && (
        <div className="mb-4 flex gap-2 flex-wrap" data-name="searchSectionFilter">
          <button
            onClick={() => handleSectionChange('')}
            data-name="searchSectionAll"
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              !sectionId ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground hover:text-foreground'
            )}
          >
            全部分区
          </button>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              data-name={`searchSection${s.id}`}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                sectionId === s.id ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              )}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 搜索结果 */}
      {hasSearched && !loading && results.length === 0 && (
        <div className="text-center py-16" data-name="searchEmpty">
          <IconSearch size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-foreground-secondary text-sm">未找到与「{useSearchStore.getState().currentKeyword}」相关的内容</p>
          <p className="text-foreground-tertiary text-xs mt-2">试试其他关键词或减少筛选条件</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3" data-name="searchResults">
          {results.map(post => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              data-name={`searchResult${post.id}`}
              className="surfacePanel p-4 hover:border-border-hover transition-colors block group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* 标题 */}
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1" data-name={`searchResult${post.id}Title`}>
                    {post.highlightTitle ? (
                      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.highlightTitle, { ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'mark'] }) }} />
                    ) : post.title}
                  </h3>

                  {/* 摘要 */}
                  <p className="text-xs text-foreground-tertiary mt-1.5 line-clamp-2" data-name={`searchResult${post.id}Content`}>
                    {post.highlightContent ? (
                      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.highlightContent, { ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'mark'] }) }} />
                    ) : post.content?.substring(0, 150)}
                  </p>

                  {/* 元信息 */}
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap" data-name={`searchResult${post.id}Meta`}>
                    <div className="flex items-center gap-1.5">
                      <Avatar size="xs" src={post.authorAvatar} fallback={post.authorName} />
                      <span className="text-xs text-foreground-secondary">{post.authorName}</span>
                    </div>
                    <span className="text-xs text-foreground-tertiary">
                      <IconEye size={11} className="inline mr-0.5" />{post.viewCount}
                    </span>
                    <span className="text-xs text-foreground-tertiary">
                      <IconHeart size={11} className="inline mr-0.5" />{post.likeCount}
                    </span>
                    <span className="text-xs text-foreground-tertiary">
                      <IconComment size={11} className="inline mr-0.5" />{post.commentCount}
                    </span>
                    <span className="text-xs text-foreground-tertiary/60">{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>

                {post.coverImage && (
                  <img src={getThumbUrl(post.coverImage)} alt="" className="w-20 h-14 object-cover rounded-md shrink-0" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <div className="mt-6 flex justify-center" data-name="searchPagination">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onChange={(p) => doSearch(keyword, p)}
          />
        </div>
      )}
    </div>
  );
}
