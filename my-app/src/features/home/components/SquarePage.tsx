/**
 * SquarePage — 广场页（2.0 新增）
 * 合并: /posts, /rankings, /sections, /campaigns
 */
import { useEffect } from 'react';
import { usePortalStore } from '@/features/portal/store';
import { useSearchParams } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function SquarePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'hot';

  const { squarePosts, squarePostsTotal, squarePostsLoading, fetchSquarePosts } = usePortalStore();

  useEffect(() => {
    fetchSquarePosts({ page: 1, sortBy: tab === 'latest' ? 'latest' : 'hot' });
  }, [tab, fetchSquarePosts]);

  const tabs = [
    { key: 'hot', label: '热门' },
    { key: 'latest', label: '最新' },
    { key: 'rankings', label: '排行' },
    { key: 'sections', label: '板块' },
    { key: 'campaigns', label: '活动' },
  ];

  return (
    <div data-name="squarePage" className="p-4">
      {/* Tab 切换 */}
      <div data-name="squareTabs" className="flex gap-1 mb-6 border-b border-border/50 pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            data-name={`squareTab${t.key}`}
            onClick={() => setSearchParams({ tab: t.key })}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'text-primary border-b-2 border-primary bg-primary-muted/50'
                : 'text-foreground-secondary hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {squarePostsLoading && squarePosts.length === 0 ? (
        <PageSkeleton />
      ) : (
        <div data-name="squareContent" className="space-y-4">
          {squarePosts.length === 0 ? (
            <div className="text-center py-12 text-foreground-tertiary">
              暂无内容
            </div>
          ) : (
            squarePosts.map((post: any) => (
              <div
                key={post.id}
                data-name="squarePostCard"
                className="cardInteractive p-4 cursor-pointer"
              >
                <h3 className="font-medium text-foreground mb-1">{post.title}</h3>
                <p className="text-sm text-foreground-secondary line-clamp-2">{post.summary || post.content?.slice(0, 100)}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary">
                  <span>{post.authorName}</span>
                  <span>{post.likeCount} 赞</span>
                  <span>{post.commentCount} 评论</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}