import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortalStore } from '@/features/portal/store';
import { PostCard } from '@/features/posts/components/PostCard';
import { SECTIONS } from '@/lib/navConfig';
import { IconClock, IconFire } from '@/components/ui/Icon';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export function SectionBrowse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tag = searchParams.get('tag') || undefined;
  const sectionId = searchParams.get('sectionId') || undefined;
  const { squarePosts, squarePostsLoading, selectedSectionId, postsSortBy, setSelectedSectionId, setPostsSortBy, fetchSquarePosts, sections, fetchSections } = usePortalStore();

  useEffect(() => {
    fetchSections();
    setSelectedSectionId(sectionId || '');
    fetchSquarePosts({ page: 1, sortBy: postsSortBy, sectionId, tag });
  }, [sectionId, tag]);

  const displaySections = sections.length > 0 ? sections : SECTIONS;

  return (
    <div data-name="sectionBrowse">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide" data-name="sectionTags">
        <button
          onClick={() => navigate('/square')}
          data-name="sectionTagAll"
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            !selectedSectionId ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/40 text-foreground-secondary hover:text-foreground'
          )}
        >
          全部
        </button>
        {displaySections.map((s: any) => (
          <button
            key={s.id}
            onClick={() => navigate(`/square?sectionId=${s.id}`)}
            data-name={`sectionTag${s.id}`}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              selectedSectionId === s.id ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/40 text-foreground-secondary hover:text-foreground'
            )}
          >
            {s.icon || ''} {s.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4" data-name="sectionSort">
        <button
          onClick={() => setPostsSortBy('hot')}
          data-name="sectionSortHot"
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            postsSortBy === 'hot' ? 'bg-primary/10 text-primary' : 'text-foreground-tertiary hover:text-foreground'
          )}
        >
          <IconFire size={12} /> 最热
        </button>
        <button
          onClick={() => setPostsSortBy('latest')}
          data-name="sectionSortLatest"
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            postsSortBy === 'latest' ? 'bg-primary/10 text-primary' : 'text-foreground-tertiary hover:text-foreground'
          )}
        >
          <IconClock size={12} /> 最新
        </button>
      </div>

      {squarePostsLoading && squarePosts.length === 0 ? (
        <PageSkeleton />
      ) : squarePosts.length === 0 ? (
        <div className="text-center py-16 text-foreground-tertiary" data-name="sectionEmpty">
          <p className="text-sm">暂无帖子</p>
        </div>
      ) : (
        <div className="space-y-3" data-name="sectionPostList">
          {squarePosts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
