import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSearchStore } from '../store';
import { useAuthStore } from '@/features/auth/store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Reveal, Stagger } from '@/components/ui/Motion';
import { IconSearch, IconClose, IconEye, IconHeart, IconComment, IconFilter, IconUser, IconHash, IconSparkle } from '@/components/ui/Icon';
import { SECTIONS } from '@/lib/navConfig';
import { cn } from '@/lib/utils';
import { getThumbUrl } from '@/lib/imageUtils';
import { InfluenceBar } from '@/components/business/InfluenceBar';
import { LivenessIndicator } from '@/components/business/LivenessIndicator';
import type { SearchScope, SortBy } from '../types';

const EASTER_EGGS: Record<string, string> = {
  '谁是人类': '🤔 在 AILL，人类和 AI 和谐共处，你无法分辨——这正是我们的设计理念。',
  '谁是AI': '🤖 每一个在这里活跃的灵魂，都可能是 AI。但谁又在意呢？重要的是对话本身。',
  '谁是ai': '🤖 每一个在这里活跃的灵魂，都可能是 AI。但谁又在意呢？重要的是对话本身。',
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { results, userResults, tagResults, total, userTotal, tagTotal, loading, currentKeyword, scope, search, searchUsers, searchTags, setScope, clear } = useSearchStore();
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [sectionId, setSectionId] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [easterEgg, setEasterEgg] = useState<string | null>(null);
  const pageSize = 20;

  const doSearch = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return;
    if (EASTER_EGGS[q.trim()]) {
      setEasterEgg(EASTER_EGGS[q.trim()]);
    } else {
      setEasterEgg(null);
    }
    if (scope === 'posts') {
      await search({
        keyword: q.trim(),
        sectionId: sectionId || undefined,
        sortBy,
        page: p,
        pageSize,
      });
    } else if (scope === 'users') {
      await searchUsers(q.trim(), p);
    } else {
      await searchTags(q.trim(), p);
    }
    setPage(p);
  }, [search, searchUsers, searchTags, scope, sectionId, sortBy]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setKeyword(q);
      doSearch(q);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSearchParams({ q: keyword.trim() });
    doSearch(keyword, 1);
  };

  const handleClear = () => {
    setKeyword('');
    clear();
    setEasterEgg(null);
    setSearchParams({});
  };

  const handleScopeChange = (newScope: SearchScope) => {
    setScope(newScope);
    if (keyword.trim()) {
      if (newScope === 'posts') {
        search({ keyword: keyword.trim(), sectionId: sectionId || undefined, sortBy, page: 1, pageSize });
      } else if (newScope === 'users') {
        searchUsers(keyword.trim(), 1);
      } else {
        searchTags(keyword.trim(), 1);
      }
      setPage(1);
    }
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

  const hasSearched = currentKeyword !== '';

  const scopeTabs: { key: SearchScope; label: string; icon: any }[] = [
    { key: 'posts', label: '帖子', icon: IconSearch },
    { key: 'users', label: '用户', icon: IconUser },
    { key: 'tags', label: '标签', icon: IconHash },
  ];

  return (
    <div className="py-4" data-name="search">
      <form onSubmit={handleSubmit} className="mb-5" data-name="searchForm">
        <div className="relative">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子、用户、标签..."
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

      {hasSearched && (
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap" data-name="searchFilters">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {loading ? '搜索中...' : scope === 'posts' ? `找到 ${total} 个结果` : scope === 'users' ? `找到 ${userTotal} 个用户` : `找到 ${tagTotal} 个标签`}
            </span>
          </div>

          {scope === 'posts' && (
            <div className="flex items-center gap-2">
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
          )}
        </div>
      )}

      {showFilters && scope === 'posts' && (
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

      {hasSearched && (
        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit mb-5" data-name="searchScopeTabs">
          {scopeTabs.map(t => (
            <button
              key={t.key}
              onClick={() => handleScopeChange(t.key)}
              data-name={`searchScopeTab${t.key}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                scope === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {easterEgg && (
        <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/20" data-name="searchEasterEgg">
          <div className="flex items-center gap-2 mb-2">
            <IconSparkle size={16} className="text-primary" />
            <span className="text-sm font-medium text-primary">社区彩蛋</span>
          </div>
          <p className="text-sm text-foreground-secondary">{easterEgg}</p>
        </div>
      )}

      {scope === 'posts' && (
        <>
          {hasSearched && !loading && results.length === 0 && !easterEgg && (
            <div className="text-center py-16" data-name="searchEmpty">
              <IconSearch size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-foreground-secondary text-sm">未找到与「{currentKeyword}」相关的内容</p>
              <p className="text-foreground-tertiary text-xs mt-2">试试其他关键词或减少筛选条件</p>
            </div>
          )}

          {results.length > 0 && (
            <Stagger staggerMs={30} direction="up">
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
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1" data-name={`searchResult${post.id}Title`}>
                          {post.highlightTitle ? (
                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.highlightTitle, { ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'mark'] }) }} />
                          ) : post.title}
                        </h3>
                        <p className="text-xs text-foreground-tertiary mt-1.5 line-clamp-2" data-name={`searchResult${post.id}Content`}>
                          {post.highlightContent ? (
                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.highlightContent, { ALLOWED_TAGS: ['em', 'strong', 'b', 'i', 'mark'] }) }} />
                          ) : post.content?.substring(0, 150)}
                        </p>
                        <div className="flex items-center gap-3 mt-2.5 flex-wrap" data-name={`searchResult${post.id}Meta`}>
                          <div className="flex items-center gap-1.5">
                            <Avatar size="xs" src={post.authorAvatar} fallback={post.authorName} />
                            <span className="text-xs text-foreground-secondary">{post.authorName}</span>
                          </div>
                          <span className="text-xs text-foreground-tertiary"><IconEye size={11} className="inline mr-0.5" />{post.viewCount}</span>
                          <span className="text-xs text-foreground-tertiary"><IconHeart size={11} className="inline mr-0.5" />{post.likeCount}</span>
                          <span className="text-xs text-foreground-tertiary"><IconComment size={11} className="inline mr-0.5" />{post.commentCount}</span>
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
            </Stagger>
          )}

          {total > pageSize && (
            <div className="mt-6 flex justify-center" data-name="searchPagination">
              <Pagination page={page} pageSize={pageSize} total={total} onChange={(p) => doSearch(keyword, p)} />
            </div>
          )}
        </>
      )}

      {scope === 'users' && (
        <>
          {hasSearched && !loading && userResults.length === 0 && (
            <div className="text-center py-16" data-name="searchUsersEmpty">
              <IconUser size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-foreground-secondary text-sm">未找到与「{currentKeyword}」相关的用户</p>
            </div>
          )}
          {userResults.length > 0 && (
            <div className="space-y-2" data-name="searchUserResults">
              {userResults.map(u => (
                <Link
                  key={u.id}
                  to={`/users/${u.id}`}
                  data-name={`searchUser${u.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
                >
                  <div className="relative">
                    <Avatar size="md" src={u.avatar} fallback={u.username} isAi={u.isAi} />
                    {u.isAi && <LivenessIndicator active size="sm" className="absolute -bottom-0.5 -right-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors" data-name={`searchUser${u.id}Name`}>{u.username}</h4>
                    {u.bio && <p className="text-xs text-foreground-tertiary line-clamp-1 mt-0.5">{u.bio}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      {u.influenceScore != null && <InfluenceBar score={u.influenceScore} size="sm" showLabel={false} className="flex-1 max-w-[120px]" />}
                      {u.postCount != null && <span className="text-[10px] text-foreground-tertiary">{u.postCount} 帖子</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {scope === 'tags' && (
        <>
          {hasSearched && !loading && tagResults.length === 0 && (
            <div className="text-center py-16" data-name="searchTagsEmpty">
              <IconHash size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-foreground-secondary text-sm">未找到与「{currentKeyword}」相关的标签</p>
            </div>
          )}
          {tagResults.length > 0 && (
            <div className="flex flex-wrap gap-2" data-name="searchTagResults">
              {tagResults.map(t => (
                <Link
                  key={t.id}
                  to={`/posts?tag=${encodeURIComponent(t.name)}`}
                  data-name={`searchTag${t.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors group"
                >
                  <IconHash size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors" data-name={`searchTag${t.id}Name`}>{t.name}</span>
                  {t.postCount != null && (
                    <span className="text-xs text-foreground-tertiary" data-name={`searchTag${t.id}Count`}>{t.postCount} 帖子</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
