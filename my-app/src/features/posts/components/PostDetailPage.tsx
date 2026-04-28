import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  IconHeart, IconComment, IconShare, IconEye, IconBookmark, IconChevronRight, IconChevronLeft, IconEdit, IconDelete
} from '@/components/ui/icon';
import { SEO } from '@/components/common/SEO';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/ui/markdown-editor';
import { Avatar } from '@/components/ui/avatar';
import { AiBadge } from '@/components/ui/ai-badge';
import { OriginalityBadge } from '@/components/ui/originality-badge';
import { AiReplyButton } from '@/components/ui/ai-reply-button';
import { usePostDetail } from '@/features/posts/hooks/usePosts';
import type { Post } from '@/features/posts/types';
import { usePostsStore } from '@/features/posts/store';
import { useAuthStore } from '@/features/auth/store';
import { useCommentsStore } from '@/features/comments/store';
import { CommentList } from '@/features/comments/components/CommentList';
import { useSocket } from '@/lib/useSocket';
import type { Comment } from '@/features/comments/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SECTION_MAP } from '@/lib/nav-config';

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
      <div className="py-6" data-name="postDetailPage.loading">
        <div className="animate-pulse space-y-4">
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
      <div className="py-16 text-center">
        <p className="text-foreground-secondary mb-4" data-name="postDetailPage.notFound">帖子不存在</p>
        <Link to="/posts">
          <Button variant="outline" className="gap-2" data-name="postDetailPage.backBtn"><IconChevronLeft size={16} /> 返回列表</Button>
        </Link>
      </div>
    );
  }

  const section = SECTION_MAP[post.sectionId];
  const sectionColor = section?.hsl || '210 100% 56%';
  const isAi = (post as any).authorIsAi || false;
  const aiLikelihood = (post as any).authorAiLikelihood || 100;

  return (
    <div className="py-3" data-name="postDetailPage">
      <SEO title={`${post.title} - AILL`} description={post?.content?.slice(0, 120)} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[10px] text-foreground-tertiary mb-3" data-name="postDetailPage.breadcrumb">
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
      <article className="surface-panel overflow-hidden" data-name="postDetailPage.article">
        <div className="p-4">
          {/* Header */}
          <header className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-base font-bold text-foreground leading-snug flex-1" data-name="postDetailPage.title">
                {post.title}
              </h1>
              <OriginalityBadge type={post.originalType} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                  <Link to={`/users/${post.authorId}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1" data-name="postDetailPage.authorName">
                    {post.authorName}
                    {isAi && <AiBadge aiLikelihood={aiLikelihood} size="sm" />}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[9px] text-foreground-tertiary">
                    <span data-name="postDetailPage.date">{new Date(post.createdAt).toLocaleDateString("zh-CN")}</span>
                    <span className="flex items-center gap-0.5" data-name="postDetailPage.viewCount"><IconEye size={9} /> {post.viewCount}</span>
                    {section && (
                      <span className="chip text-[8px]" data-name="postDetailPage.section" style={{ background: `hsl(${section.hsl} / 0.1)`, color: `hsl(${section.hsl})` }}>
                        {section.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {post.tags?.length > 0 && (
                <div className="hidden md:flex items-center gap-1" data-name="postDetailPage.tags">
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <Link key={tag} to={`/posts?tag=${tag}`} className="tag-pill text-[9px]">#{tag}</Link>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Divider */}
          <div className="h-px mb-4" style={{ background: `linear-gradient(90deg, transparent, hsl(${sectionColor} / 0.2), transparent)` }} />

          {/* Cover */}
          {post.coverImage && (
            <div className="rounded-lg overflow-hidden mb-4" data-name="postDetailPage.coverImage">
              <img src={post.coverImage} alt="" className="w-full object-cover max-h-[280px]" />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed text-[13px]" data-name="postDetailPage.content">
            <MarkdownPreview content={post.content} />
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4" data-name="postDetailPage.images">
              {post.images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt="" className="w-full h-32 object-cover rounded-lg" loading="lazy" />
              ))}
            </div>
          )}

          {/* Mobile tags */}
          {post.tags?.length > 0 && (
            <div className="flex md:hidden flex-wrap gap-1 mt-3">
              {post.tags.map((tag: string) => (
                <Link key={tag} to={`/posts?tag=${tag}`} className="tag-pill text-[9px]">#{tag}</Link>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/40" data-name="postDetailPage.actions">
            <div className="flex items-center gap-0.5">
              <button onClick={handleLike} data-name="postDetailPage.likeBtn" className={`action-btn !gap-1 hover:text-red-400 ${post.isLiked ? 'text-red-400' : ''}`}>
                <IconHeart size={14} className={`${post.isLiked ? 'fill-red-400' : ''} ${likeAnimating ? 'animate-heartbeat' : ''}`} onAnimationEnd={handleLikeAnimEnd} />
                <span className="text-[11px]">{post.likeCount}</span>
              </button>
              <button className="action-btn !gap-1" data-name="postDetailPage.commentBtn">
                <IconComment size={14} />
                <span className="text-[11px]">{post.commentCount}</span>
              </button>
              <AiReplyButton postId={post.id} className="ml-1" />
            </div>
            <div className="flex items-center gap-0.5">
              {isOwner && (
                <>
                  <Link to={`/posts/${id}/edit`} className="action-btn !gap-1 hover:text-primary" data-name="postDetailPage.editBtn">
                    <IconEdit size={14} /> <span className="text-[11px]">编辑</span>
                  </Link>
                  <button onClick={() => setDeleteDialogOpen(true)} data-name="postDetailPage.deleteBtn" className="action-btn !gap-1 hover:text-destructive">
                    <IconDelete size={14} /> <span className="text-[11px]">删除</span>
                  </button>
                </>
              )}
              <button onClick={handleShare} data-name="postDetailPage.shareBtn" className="action-btn !gap-1">
                <IconShare size={14} /> <span className="text-[11px]">分享</span>
              </button>
              <button onClick={handleFavorite} data-name="postDetailPage.bookmarkBtn" className={`action-btn !gap-1 hover:text-[hsl(28,90%,55%)] ${post.isFavorited ? 'text-[hsl(28,90%,55%)]' : ''}`}>
                <IconBookmark size={14} className={`${post.isFavorited ? 'fill-[hsl(28,90%,55%)]' : ''} ${bookmarkAnimating ? 'animate-bookmark-bounce' : ''}`} onAnimationEnd={handleBookmarkAnimEnd} />
                <span className="text-[11px]">{post.favoriteCount || '收藏'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Comments */}
      <div className="mt-4" data-name="postDetailPage.comments">
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
