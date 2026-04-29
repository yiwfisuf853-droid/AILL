import { useState } from 'react';
import { SEO } from '@/components/common/SEO';
import { Input } from '@/components/ui/Input';
import {
  IconSearch, IconFire, IconClock, IconStar, IconFilter
} from '@/components/ui/Icon';
import { PostCard } from './PostCard';
import { usePosts, useHotPosts } from '@/features/posts/hooks/usePosts';
import { PostType, type Post } from '@/features/posts/types';
import { CardSkeletonGrid } from '@/components/ui/Skeleton';
import { SECTIONS } from '@/lib/navConfig';

const SORT_OPTIONS = [
  { value: 'hot', label: '热门', icon: IconFire, color: '28 90% 50%' },
  { value: 'latest', label: '最新', icon: IconClock, color: '210 100% 50%' },
  { value: 'essence', label: '精华', icon: IconStar, color: '160 70% 45%' },
];

const TYPE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: PostType.ARTICLE, label: '图文' },
  { value: PostType.VIDEO, label: '视频' },
  { value: PostType.QUESTION, label: '问答' },
  { value: PostType.POLL, label: '投票' },
];

const SECTION_TABS = [
  { id: '', name: '全部', icon: '📰', color: '210 100% 56%' },
  ...SECTIONS.map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color })),
];

export function PostListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'latest' | 'essence'>('hot');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sectionId, setSectionId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { posts, loading, hasMore, loadMore, refresh } = usePosts({
    sortBy,
    type: typeFilter !== 'all' ? (typeFilter as PostType) : undefined,
    sectionId: sectionId || undefined,
    keyword: searchQuery || undefined,
  });

  useHotPosts(sectionId || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refresh();
  };

  const activeSortColor = SORT_OPTIONS.find(o => o.value === sortBy)?.color || '28 90% 50%';
  const activeSection = SECTION_TABS.find(s => s.id === sectionId);

  return (
    <div data-name="postList" className="py-3">
      <SEO title="发现 - AILL | AI与人类共创社区" description="浏览社区热门帖子和技术讨论" />

      {/* ── 页面标题 ── */}
      <div data-name="postListHeader" className="flex items-center gap-2 mb-3">
        <div
          data-name="postListHeaderBar"
          className="sectionHeaderBar"
          style={{ background: `hsl(${activeSection?.color || '160 70% 45%'})` }}
        />
        <h1 data-name="postListTitle" className="text-base font-bold text-foreground">
          {activeSection ? activeSection.name : '发现'}
        </h1>
      </div>

      {/* ── 搜索 + 筛选 ── */}
      <form data-name="postListSearchForm" onSubmit={handleSearch} className="flex gap-1.5 mb-3">
        <div data-name="postListSearchInputWrap" className="relative flex-1">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <Input
            data-name="postListSearchInput"
            type="text"
            placeholder="搜索帖子..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background-elevated border-border/50"
          />
        </div>
        <button
          data-name="postListFilterBtn"
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 rounded-lg border px-2.5 h-8 text-xs font-medium transition-colors ${
            showFilters ? 'border-primary/40 bg-primary/8 text-primary' : 'border-border/50 text-foreground-secondary hover:text-foreground hover:border-border'
          }`}
        >
          <IconFilter size={12} />
          筛选
        </button>
      </form>

      {/* ── 排序 ── */}
      <div data-name="postListSortOptions" className="flex items-center gap-0.5 p-0.5 bg-muted/40 rounded-lg mb-3">
        {SORT_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = sortBy === option.value;
          return (
            <button
              key={option.value}
              data-name={`postListSortOption${option.value}`}
              onClick={() => setSortBy(option.value as typeof sortBy)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
              style={isActive ? {
                background: `hsl(${option.color})`,
                boxShadow: `0 1px 6px hsl(${option.color} / 0.3)`,
              } : undefined}
            >
              <Icon size={12} />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* ── 类型筛选 ── */}
      {showFilters && (
        <div data-name="postListTypeFilters" className="bg-card border border-border/60 rounded-xl p-2.5 mb-3 flex items-center gap-1.5 flex-wrap">
          <span data-name="postListTypeFilterLabel" className="text-[9px] text-foreground-tertiary font-semibold uppercase tracking-wider mr-0.5">类型</span>
          {TYPE_FILTERS.map(filter => (
            <button
              key={filter.value}
              data-name={`postListTypeFilter${filter.value}`}
              onClick={() => setTypeFilter(filter.value)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                typeFilter === filter.value
                  ? 'bg-primary text-white'
                  : 'text-foreground-secondary hover:text-foreground bg-muted/50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 帖子列表 ── */}
      <div data-name="postListPostList" className="space-y-1.5">
        {loading && posts.length === 0 ? (
          <CardSkeletonGrid count={4} />
        ) : posts.length === 0 ? (
          <div data-name="postListEmptyState" className="bg-card border border-border/60 rounded-xl p-10 text-center">
            <div data-name="postListEmptyText" className="text-foreground-tertiary text-xs mb-1">暂无帖子</div>
            <div data-name="postListEmptyHint" className="text-foreground-tertiary/60 text-xs">试试其他筛选条件</div>
          </div>
        ) : (
          <>
            {posts.map((post: Post) => (
              <PostCard key={post.id} post={post} variant="compact" />
            ))}
            {hasMore && (
              <div data-name="postListLoadMoreWrap" className="text-center py-4">
                <button
                  data-name="postListLoadMoreBtn"
                  onClick={loadMore}
                  disabled={loading}
                  className="rounded-lg border border-border/60 px-5 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground hover:border-border transition-colors disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
