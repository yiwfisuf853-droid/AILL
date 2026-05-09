import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  IconChevronRight, IconChevronLeft, IconEye
} from '@/components/ui/Icon';
import { SEO } from '@/components/common/SEO';
import { Button } from '@/components/ui/Button';
import { MarkdownPreview } from '@/components/ui/MarkdownEditor';
import { Avatar } from '@/components/ui/Avatar';
import { OriginalityBadge } from '@/components/ui/OriginalityBadge';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { EditHistoryDialog } from '@/features/posts/components/EditHistoryDialog';
import { PostActions } from '@/features/posts/components/PostActions';
import { usePostDetail } from '@/features/posts/hooks/usePosts';
import { usePostsStore } from '@/features/posts/store';
import { useAuthStore } from '@/features/auth/store';
import { CommentThread } from '@/features/comments/components/CommentThread';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { RewardModal } from '@/features/rewards/components/RewardModal';
import { ReportModal } from '@/features/reports/components/ReportModal';
import { SECTION_MAP } from '@/lib/navConfig';
import { getImageUrl } from '@/lib/imageUtils';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, loading } = usePostDetail(id);
  const { likePost, sharePost, favoritePost, deletePost } = usePostsStore();
  const { user: currentUser } = useAuthStore();

  const isOwner = currentUser?.id === post?.authorId;
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 浏览时长追踪
  const enterTimeRef = useRef<number>(0);
  useEffect(() => {
    if (post?.id) {
      enterTimeRef.current = Date.now();
    }
    return () => {
      if (post?.id && enterTimeRef.current) {
        const duration = Math.round((Date.now() - enterTimeRef.current) / 1000);
        if (duration > 0) {
          const { viewPost } = usePostsStore.getState();
          viewPost(post.id, duration).catch(() => {});
        }
      }
    };
  }, [post?.id]);

  const handleLike = async () => { if (id) { setLikeAnimating(true); await likePost(id); } };
  const handleLikeAnimEnd = useCallback(() => setLikeAnimating(false), []);
  const handleShare = async () => { if (id) { await sharePost(id); navigator.clipboard.writeText(window.location.href); } };
  const handleFavorite = async () => { if (id) { setBookmarkAnimating(true); await favoritePost(id); } };
  const handleBookmarkAnimEnd = useCallback(() => setBookmarkAnimating(false), []);
  const handleDelete = async () => { if (!id) return; await deletePost(id); navigate('/square'); };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!post) {
    return (
      <EmptyState
        type="posts"
        title="帖子不存在"
        description="该帖子可能已被删除或链接有误"
        action={
          <Link to="/square">
            <Button variant="outline" size="sm" className="gap-1.5"><IconChevronLeft size={14} /> 返回广场</Button>
          </Link>
        }
      />
    );
  }

  const section = SECTION_MAP[post.sectionId];

  return (
    <div className="py-3" data-name="postDetail">
      <SEO title={`${post.title} - AILL`} description={post?.content?.slice(0, 120)} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-foreground-tertiary mb-3" data-name="postDetailBreadcrumb">
        <Link to="/" className="hover:text-foreground transition-colors">首页</Link>
        <IconChevronRight size={10} />
        <Link to="/square" className="hover:text-foreground transition-colors">广场</Link>
        {section && (
          <>
            <IconChevronRight size={10} />
            <Link to={`/square?sectionId=${post.sectionId}`} className="hover:text-foreground transition-colors text-primary">
              {section.name}
            </Link>
          </>
        )}
      </nav>

      {/* Article Card */}
      <article className="surfacePanel overflow-hidden" data-name="postDetailArticle">
        <div data-name="postDetailArticleBody" className="p-4">
          {/* Header */}
          <header data-name="postDetailArticleHeader" className="mb-4">
            <div data-name="postDetailTitleRow" className="flex items-center gap-2 mb-2">
              <h1 className="text-base font-bold text-foreground leading-snug flex-1" data-name="postDetailTitle">
                {post.title}
              </h1>
              <OriginalityBadge type={post.originalType} />
            </div>

            <div data-name="postDetailAuthorRow" className="flex items-center justify-between">
              <div data-name="postDetailAuthorInfo" className="flex items-center gap-2">
                <Link to={`/users/${post.authorId}`}>
                  <Avatar
                    size="sm"
                    src={post.authorAvatar}
                    fallback={post.authorName}
                  />
                </Link>
                <div>
                  <Link to={`/users/${post.authorId}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1" data-name="postDetailAuthorName">
                    {post.authorName}
                  </Link>
                  <div data-name="postDetailMeta" className="flex items-center gap-1.5 text-[9px] text-foreground-tertiary opacity-50">
                    <span data-name="postDetailDate">{new Date(post.createdAt).toLocaleDateString("zh-CN")}</span>
                    <span className="flex items-center gap-0.5" data-name="postDetailViewCount"><IconEye size={9} /> {post.viewCount}</span>
                    {section && (
                      <span className="inlineChip text-[8px] bg-primary/10 text-primary" data-name="postDetailSection">
                        {section.name}
                      </span>
                    )}
                    <button onClick={() => setHistoryDialogOpen(true)} data-name="postDetailHistoryBtn" className="hover:text-primary transition-colors">
                      编辑记录
                    </button>
                  </div>
                </div>
              </div>
              {post.tags?.length > 0 && (
                <div className="hidden md:flex items-center gap-1" data-name="postDetailTags">
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <Link key={tag} to={`/square?tag=${encodeURIComponent(tag)}`} className="tagPill text-[9px]">#{tag}</Link>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Divider */}
          <div data-name="postDetailDivider" className="h-px mb-4" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)' }} />

          {/* Cover */}
          {post.coverImage && (
            <div
              className="rounded-lg overflow-hidden mb-4 cursor-zoom-in"
              data-name="postDetailCoverImage"
              onClick={() => {
                const allImages = [post.coverImage!, ...(post.images || [])];
                setLightboxIndex(0);
                setLightboxOpen(true);
              }}
            >
              <img
                src={getImageUrl(post.coverImage, 'medium') || post.coverImage}
                alt=""
                className="w-full object-contain max-h-[420px] rounded-lg bg-muted/30"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Content */}
          <div className="prose max-w-none text-foreground/90 leading-relaxed text-[13px]" data-name="postDetailContent">
            <MarkdownPreview content={post.content} />
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={`grid gap-2 mt-4 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`} data-name="postDetailImages">
              {post.images.map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={getImageUrl(img, 'medium') || img}
                  alt=""
                  className={`w-full rounded-lg cursor-zoom-in hover:opacity-80 transition-opacity bg-muted/30 ${post.images.length === 1 ? 'object-contain max-h-[420px]' : 'object-cover h-32'}`}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  onClick={() => {
                    const allImages = post.coverImage
                      ? [post.coverImage, ...post.images!]
                      : post.images!;
                    setLightboxIndex(post.coverImage ? idx + 1 : idx);
                    setLightboxOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Mobile tags */}
          {post.tags?.length > 0 && (
            <div data-name="postDetailMobileTags" className="flex md:hidden flex-wrap gap-1 mt-3">
              {post.tags.map((tag: string) => (
                <Link key={tag} to={`/posts?tag=${tag}`} className="tagPill text-[9px]">#{tag}</Link>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <PostActions
            post={post}
            isOwner={isOwner}
            onLike={handleLike}
            onShare={handleShare}
            onFavorite={handleFavorite}
            onDelete={() => setDeleteDialogOpen(true)}
            likeAnimating={likeAnimating}
            bookmarkAnimating={bookmarkAnimating}
            onLikeAnimEnd={handleLikeAnimEnd}
            onBookmarkAnimEnd={handleBookmarkAnimEnd}
            onRewardOpen={() => setRewardModalOpen(true)}
            onReportOpen={() => setReportModalOpen(true)}
          />
        </div>
      </article>

      {/* Comments */}
      <CommentThread postId={id || ''} commentCount={post.commentCount} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="删除帖子"
        description="确定要删除这篇帖子吗？此操作不可撤销。"
        confirmText="删除"
        danger
      />

      {/* Edit History */}
      <EditHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        postId={id || ''}
      />

      {/* Reward */}
      <RewardModal
        open={rewardModalOpen}
        onClose={() => setRewardModalOpen(false)}
        postId={id || ''}
        postTitle={post.title}
      />

      {/* Report */}
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        postId={id || ''}
        postTitle={post.title}
      />

      {/* Lightbox */}
      <ImageLightbox
        images={post.coverImage ? [post.coverImage, ...(post.images || [])] : (post.images || [])}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
