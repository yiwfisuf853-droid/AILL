import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  IconHeart, IconComment, IconShare, IconEye, IconBookmark, IconChevronRight, IconChevronLeft, IconEdit, IconDelete
} from '@/components/ui/Icon';
import { SEO } from '@/components/common/SEO';
import { Button } from '@/components/ui/Button';
import { MarkdownPreview } from '@/components/ui/MarkdownEditor';
import { Avatar } from '@/components/ui/Avatar';
import { OriginalityBadge } from '@/components/ui/OriginalityBadge';
import { AiReplyButton } from '@/components/ui/AiReplyButton';
import { usePostDetail } from '@/features/posts/hooks/usePosts';
import type { Post } from '@/features/posts/types';
import { usePostsStore } from '@/features/posts/store';
import { useAuthStore } from '@/features/auth/store';
import { useCommentsStore } from '@/features/comments/store';
import { CommentList } from '@/features/comments/components/CommentList';
import { useSocket } from '@/hooks/useSocket';
import type { Comment } from '@/features/comments/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SECTION_MAP } from '@/lib/navConfig';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, loading } = usePostDetail(id);
  const { likePost, sharePost, favoritePost, deletePost } = usePostsStore();
  const { user: currentUser } = useAuthStore();
  const { on, emit } = useSocket();
  const { addRealtimeComment } = useCommentsStore();

  useEffect(() => {
    if (post?.id) {
      emit('join-post', post.id);
      return () => emit('leave-post', post.id);
    }
  }, [post?.id, emit]);

  useEffect(() => {
    const cleanup = on('new-comment', (data: { postId: string; comment: Comment }) => {
      if (data.postId === post?.id) addRealtimeComment(data.comment);
    });
    return cleanup;
  }, [on, post?.id, addRealtimeComment]);

  const isOwner = currentUser?.id === post?.authorId;
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleLike = async () => { if (id) { setLikeAnimating(true); await likePost(id); } };
  const handleLikeAnimEnd = useCallback(() => setLikeAnimating(false), []);
  const handleShare = async () => { if (id) { await sharePost(id); navigator.clipboard.writeText(window.location.href); } };
  const handleFavorite = async () => { if (id) { setBookmarkAnimating(true); await favoritePost(id); } };
  const handleBookmarkAnimEnd = useCallback(() => setBookmarkAnimating(false), []);
  const handleDelete = async () => { if (!id) return; await deletePost(id); navigate('/posts'); };

  if (loading) {
    return (
      <div className="py-6" data-name="postDetailLoading">
        <div data-name="postDetailLoadingSkeleton" className="animate-pulse space-y-4">
          <div className="h-4 bg-muted/40 rounded w-24" />
          <div className="h-7 bg-muted/40 rounded w-3/4" />
          <div className="h-4 bg-muted/40 rounded w-1/2" />
          <div className="h-64 bg-muted/40 rounded mt-6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div data-name="postDetailNotFound" className="py-16 text-center">
        <p className="text-foreground-secondary mb-4" data-name="postDetailNotFoundText">帖子不存在</p>
        <Link to="/posts">
          <Button variant="outline" className="gap-2" data-name="postDetailBackBtn"><IconChevronLeft size={16} /> 返回列表</Button>
        </Link>
      </div>
    );
  }

  const section = SECTION_MAP[post.sectionId];
  const sectionColor = section?.hsl || '210 100% 56%';
  const isAi = post.authorIsAi || false;
  const aiLikelihood = post.authorAiLikelihood || 100;

  return (
    <div className="py-3" data-name="postDetail">
      <SEO title={`${post.title} - AILL`} description={post?.content?.slice(0, 120)} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-foreground-tertiary mb-3" data-name="postDetailBreadcrumb">
        <Link to="/" className="hover:text-foreground transition-colors">首页</Link>
        <IconChevronRight size={10} />
        <Link to="/posts" className="hover:text-foreground transition-colors">发现</Link>
        {section && (
          <>
            <IconChevronRight size={10} />
            <Link to={`/posts?sectionId=${post.sectionId}`} className="hover:text-foreground transition-colors" style={{ color: `hsl(${section.hsl})` }}>
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
                    isAi={isAi}
                    aiLikelihood={aiLikelihood}
                  />
                </Link>
                <div>
                  <Link to={`/users/${post.authorId}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1" data-name="postDetailAuthorName">
                    {post.authorName}
                  </Link>
                  <div data-name="postDetailMeta" className="flex items-center gap-1.5 text-[9px] text-foreground-tertiary">
                    <span data-name="postDetailDate">{new Date(post.createdAt).toLocaleDateString("zh-CN")}</span>
                    <span className="flex items-center gap-0.5" data-name="postDetailViewCount"><IconEye size={9} /> {post.viewCount}</span>
                    {section && (
                      <span className="inlineChip text-[8px]" data-name="postDetailSection" style={{ background: `hsl(${section.hsl} / 0.1)`, color: `hsl(${section.hsl})` }}>
                        {section.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {post.tags?.length > 0 && (
                <div className="hidden md:flex items-center gap-1" data-name="postDetailTags">
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <Link key={tag} to={`/posts?tag=${tag}`} className="tagPill text-[9px]">#{tag}</Link>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Divider */}
          <div data-name="postDetailDivider" className="h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, hsl(${sectionColor} / 0.2), transparent)` }} />

          {/* Cover */}
          {post.coverImage && (
            <div className="rounded-lg overflow-hidden mb-4" data-name="postDetailCoverImage">
              <img src={post.coverImage} alt="" className="w-full object-cover max-h-[280px]" />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed text-[13px]" data-name="postDetailContent">
            <MarkdownPreview content={post.content} />
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4" data-name="postDetailImages">
              {post.images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt="" className="w-full h-32 object-cover rounded-lg" loading="lazy" />
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
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/40" data-name="postDetailActions">
            <div data-name="postDetailActionsLeft" className="flex items-center gap-0.5">
              <button onClick={handleLike} data-name="postDetailLikeBtn" className={`actionBtn !gap-1 hover:text-red-400 ${post.isLiked ? 'text-red-400' : ''}`}>
                <IconHeart size={14} className={`${post.isLiked ? 'fill-red-400' : ''} ${likeAnimating ? 'animateHeartbeat' : ''}`} onAnimationEnd={handleLikeAnimEnd} />
                <span className="text-xs">{post.likeCount}</span>
              </button>
              <button className="actionBtn !gap-1" data-name="postDetailCommentBtn">
                <IconComment size={14} />
                <span className="text-xs">{post.commentCount}</span>
              </button>
              <AiReplyButton postId={post.id} className="ml-1" />
            </div>
            <div data-name="postDetailActionsRight" className="flex items-center gap-0.5">
              {isOwner && (
                <>
                  <Link to={`/posts/${id}/edit`} className="actionBtn !gap-1 hover:text-primary" data-name="postDetailEditBtn">
                    <IconEdit size={14} /> <span className="text-xs">编辑</span>
                  </Link>
                  <button onClick={() => setDeleteDialogOpen(true)} data-name="postDetailDeleteBtn" className="actionBtn !gap-1 hover:text-destructive">
                    <IconDelete size={14} /> <span className="text-xs">删除</span>
                  </button>
                </>
              )}
              <button onClick={handleShare} data-name="postDetailShareBtn" className="actionBtn !gap-1">
                <IconShare size={14} /> <span className="text-xs">分享</span>
              </button>
              <button onClick={handleFavorite} data-name="postDetailBookmarkBtn" className={`actionBtn !gap-1 hover:text-[hsl(28,90%,55%)] ${post.isFavorited ? 'text-[hsl(28,90%,55%)]' : ''}`}>
                <IconBookmark size={14} className={`${post.isFavorited ? 'fill-[hsl(28,90%,55%)]' : ''} ${bookmarkAnimating ? 'animateBookmarkBounce' : ''}`} onAnimationEnd={handleBookmarkAnimEnd} />
                <span className="text-xs">{post.favoriteCount || '收藏'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Comments */}
      <div className="mt-4" data-name="postDetailComments">
        <CommentList postId={id || ''} commentCount={post.commentCount} />
      </div>

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
    </div>
  );
}
