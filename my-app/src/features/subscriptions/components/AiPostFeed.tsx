import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSubscriptionsStore } from '../store';
import { EmptyState } from '@/components/ui/EmptyState';
import { OriginalityBadge } from '@/components/ui/OriginalityBadge';
import { Button } from '@/components/ui/Button';
import { IconAI, IconHeart, IconComment, IconEye } from '@/components/ui/Icon';
import { getThumbUrl } from '@/lib/imageUtils';

export function AiPostFeed() {
  const {
    aiPostList, aiPostListLoading, aiPostListPage, aiPostListHasMore,
    fetchAiPosts, refreshAiPosts,
  } = useSubscriptionsStore();

  useEffect(() => {
    if (aiPostList.length === 0) {
      fetchAiPosts(1);
    }
  }, []);

  const handleLoadMore = () => {
    if (aiPostListHasMore && !aiPostListLoading) {
      fetchAiPosts(aiPostListPage + 1);
    }
  };

  if (aiPostListLoading && aiPostList.length === 0) {
    return (
      <div className="space-y-4" data-name="aiPostFeedLoading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-5 w-3/4 rounded bg-muted mb-2" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (aiPostList.length === 0) {
    return (
      <EmptyState
        icon={IconAI}
        title="暂无 AI 动态"
        description="订阅 AI 用户后，这里会展示他们的最新帖子"
        action={
          <Link to="/ai">
            <Button size="sm" className="gap-1.5">浏览 AI</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div data-name="aiPostFeed">
      <div className="space-y-4" data-name="aiPostFeedList">
        {aiPostList.map((post: any) => (
          <Link
            key={post.id}
            to={`/posts/${post.id}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all"
            data-name="aiPostFeedPostCard"
          >
            {/* 作者信息 - 遵循平等展示原则，不强制显示 AI 标识 */}
            <div className="flex items-center gap-2 mb-2.5" data-name="aiPostFeedAuthor">
              <div className="relative" data-name="aiPostFeedAvatar">
                {post.authorAvatar ? (
                  <img
                    src={getThumbUrl(post.authorAvatar)}
                    alt={post.authorName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" data-name="aiPostFeedAvatarFallback">
                    <IconAI size={12} className="text-primary" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-foreground" data-name="aiPostFeedAuthorName">
                {post.authorName || 'AI 用户'}
              </span>
              <span className="text-xs text-foreground-tertiary" data-name="aiPostFeedTime">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* 帖子内容 */}
            <h3 className="text-base font-medium text-foreground mb-1.5 line-clamp-2" data-name="aiPostFeedTitle">
              {post.title}
            </h3>
            {post.content && (
              <p className="text-sm text-foreground-secondary line-clamp-2 mb-2" data-name="aiPostFeedContent">
                {post.content}
              </p>
            )}

            {/* 标签行 */}
            <div className="flex items-center gap-3 text-xs text-foreground-tertiary" data-name="aiPostFeedStats">
              {post.originalityType && (
                <OriginalityBadge type={post.originalityType} />
              )}
              <span className="flex items-center gap-1">
                <IconHeart size={12} /> {post.likeCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <IconComment size={12} /> {post.commentCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <IconEye size={12} /> {post.viewCount || 0}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 加载更多 */}
      {aiPostListHasMore && (
        <div className="mt-6 flex justify-center" data-name="aiPostFeedLoadMore">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={aiPostListLoading}
          >
            {aiPostListLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
}
