import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collectionApi } from '@/features/collections/api';
import type { Collection } from '@/features/collections/types';
import { useAuthStore } from '@/features/auth/store';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { IconBookOpen, IconCalendar, IconChevronLeft, IconClose, IconComment, IconDelete, IconEye, IconHeart, IconPlus, IconUser } from "@/components/ui/icon";

interface CollectionPost {
  id: string;
  postId: string;
  post: {
    id: string;
    title: string;
    summary: string;
    authorName: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    createdAt: string;
  };
  sortOrder: number;
  addedAt: string;
}

interface DetailData {
  collection: Collection;
  posts: CollectionPost[];
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPostId, setAddPostId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isOwner = user && data?.collection && user.id === data.collection.userId;

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await collectionApi.getCollectionDetail(id);
      if (res.success) {
        setData({ collection: res.collection, posts: res.posts || [] });
      } else {
        setError('加载合集失败');
      }
    } catch (e: unknown) {
      setError(isApiError(e) ? e.message : '加载合集失败');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeleteCollection() {
    if (!id) return;
    try {
      const res = await collectionApi.deleteCollection(id);
      if (res.success) {
        navigate('/collections');
      } else {
        toast.error('删除失败');
      }
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '删除失败');
    }
  }

  async function handleAddPost() {
    if (!id || !addPostId.trim()) return;
    setSubmitting(true);
    try {
      const res = await collectionApi.addPostToCollection(id, { postId: addPostId.trim() });
      if (res.success) {
        setShowAddModal(false);
        setAddPostId('');
        loadData();
      } else {
        toast.error('添加帖子失败');
      }
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '添加帖子失败');
    }
    setSubmitting(false);
  }

  async function handleRemovePost(postId: string) {
    if (!id) return;
    setRemovingId(postId);
    try {
      const res = await collectionApi.removePostFromCollection(id, postId);
      if (res.success) {
        loadData();
      } else {
        toast.error('移除帖子失败');
      }
    } catch (e: unknown) {
      toast.error(isApiError(e) ? e.message : '移除帖子失败');
    }
    setRemovingId(null);
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function formatCount(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="py-3">
        <PageSkeleton />
      </div>
    );
  }

  // --- Error ---
  if (error || !data) {
    return (
      <div className="py-3" data-name="collectionDetailPage.Error">
        <div className="pt-6">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-primary text-sm mb-6 transition-colors"
            data-name="collectionDetailPage.errorBackLink"
          >
            <IconChevronLeft size={16} />
            返回合集列表
          </Link>
          <div className="text-center py-20 text-foreground-tertiary">
            <IconBookOpen size={48} className="mx-auto mb-3 opacity-50" />
            <p data-name="collectionDetailPage.errorText">{error || '合集不存在'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { collection, posts } = data;

  return (
    <div className="py-3" data-name="collectionDetailPage">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(210 100% 50% / 0.06) 0%, transparent 40%, hsl(270 65% 55% / 0.04) 100%)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: 'hsl(210 100% 50%)' }} />
        <div className="relative pt-8 pb-6">
          {/* Back link */}
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-primary text-sm mb-6 transition-colors"
            data-name="collectionDetailPage.backLink"
          >
            <IconChevronLeft size={16} />
            返回合集列表
          </Link>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Cover */}
            <div
              className="flex-shrink-0 w-full md:w-56 aspect-[2/1] md:aspect-[3/4] rounded-2xl bg-gradient-to-br from-muted to-card border border-border/50 overflow-hidden flex items-center justify-center relative"
              data-name="collectionDetailPage.cover"
            >
              <IconBookOpen size={64} className="text-foreground-tertiary/20" />
              {collection.type === 2 && (
                <div className="absolute top-3 left-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary"
                    data-name="collectionDetailPage.officialBadge"
                  >
                    官方精选
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl md:text-3xl font-black tracking-tight mb-2"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                data-name="collectionDetailPage.title"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-1">
                  {collection.name}
                </span>
              </h1>

              {collection.description && (
                <p
                  className="text-foreground-secondary text-sm leading-relaxed mb-4 max-w-2xl"
                  data-name="collectionDetailPage.desc"
                >
                  {collection.description}
                </p>
              )}

              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-tertiary mb-5">
                {collection.author && (
                  <div className="flex items-center gap-2">
                    {collection.author.avatar ? (
                      <img
                        src={collection.author.avatar}
                        alt={collection.author.username}
                        className="w-5 h-5 rounded-full object-cover"
                        data-name="collectionDetailPage.authorAvatarImg"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                        data-name="collectionDetailPage.authorAvatarFallback"
                      >
                        <IconUser size={12} className="text-foreground-tertiary" />
                      </div>
                    )}
                    <span
                      className="text-foreground-secondary"
                      data-name="collectionDetailPage.authorName"
                    >
                      {collection.author.username}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <IconCalendar size={14} />
                  <span data-name="collectionDetailPage.date">{formatDate(collection.createdAt)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5 mb-5">
                <div className="flex items-center gap-1.5 text-sm">
                  <IconBookOpen size={16} className="text-primary" />
                  <span
                    className="text-foreground font-medium"
                    data-name="collectionDetailPage.postCount"
                  >
                    {collection.postCount}
                  </span>
                  <span className="text-foreground-tertiary">篇帖子</span>
                </div>
              </div>

              {/* Owner Actions */}
              {isOwner && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover text-sm font-medium transition-colors"
                    data-name="collectionDetailPage.addPostBtn"
                  >
                    <IconPlus size={16} />
                    添加帖子
                  </button>
                  <button
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-medium transition-colors"
                    data-name="collectionDetailPage.deleteBtn"
                  >
                    <IconDelete size={16} />
                    删除合集
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="py-8">
        <div className="border-t border-border/50 pt-8">
          <h2
            className="text-lg font-bold mb-6 flex items-center gap-2"
            data-name="collectionDetailPage.postsTitle"
          >
            <IconBookOpen size={20} className="text-primary" />
            合集内容
            <span className="text-sm font-normal text-foreground-tertiary">({posts.length})</span>
          </h2>

          {posts.length === 0 ? (
            <div
              className="text-center py-16 text-foreground-tertiary"
              data-name="collectionDetailPage.postsEmpty"
            >
              <IconBookOpen size={48} className="mx-auto mb-3 opacity-40" />
              <p className="mb-1">此合集暂无帖子</p>
              {isOwner && (
                <p className="text-sm text-foreground-tertiary/60">点击上方「添加帖子」按钮添加内容</p>
              )}
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-name="collectionDetailPage.postsGrid"
            >
              {posts.map((cp) => (
                <div
                  key={cp.id}
                  className="group relative card-interactive p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  data-name={`collectionDetailPage.post.${cp.id}`}
                >
                  {/* Remove button for owner */}
                  {isOwner && (
                    <button
                      onClick={() => handleRemovePost(cp.postId)}
                      disabled={removingId === cp.postId}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-muted hover:bg-red-600/30 text-foreground-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      title="从合集中移除"
                      data-name={`collectionDetailPage.post.${cp.id}.removeBtn`}
                    >
                      <IconClose size={14} />
                    </button>
                  )}

                  <Link to={`/posts/${cp.post.id}`} className="block">
                    <h3
                      className="font-semibold mb-1.5 group-hover:text-primary transition-colors line-clamp-2 pr-8"
                      data-name={`collectionDetailPage.post.${cp.id}.title`}
                    >
                      {cp.post.title}
                    </h3>

                    {cp.post.summary && (
                      <p
                        className="text-xs text-foreground-tertiary line-clamp-2 mb-3"
                        data-name={`collectionDetailPage.post.${cp.id}.summary`}
                      >
                        {cp.post.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-tertiary">
                      <span className="text-foreground-secondary">{cp.post.authorName}</span>
                      <div className="flex items-center gap-1">
                        <IconHeart size={12} />
                        <span>{formatCount(cp.post.likeCount)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconComment size={12} />
                        <span>{formatCount(cp.post.commentCount)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconEye size={12} />
                        <span>{formatCount(cp.post.viewCount)}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Collection Confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteCollection}
        title="删除合集"
        description="确定要删除此合集吗？此操作不可撤销。"
        confirmText="删除"
        danger
      />

      {/* Add Post Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center glass"
          data-name="collectionDetailPage.addPostModal"
        >
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl bg-card border border-border shadow-elevated">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-lg font-bold text-foreground"
                data-name="collectionDetailPage.addPostModal.title"
              >
                添加帖子到合集
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddPostId('');
                }}
                className="text-foreground-tertiary hover:text-foreground transition-colors"
                data-name="collectionDetailPage.addPostModal.closeBtn"
              >
                <IconClose size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground-secondary mb-1">帖子 ID</label>
                <input
                  value={addPostId}
                  onChange={(e) => setAddPostId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-foreground-tertiary"
                  placeholder="输入帖子 ID"
                  data-name="collectionDetailPage.addPostModal.postIdInput"
                />
              </div>
              <button
                onClick={handleAddPost}
                disabled={submitting || !addPostId.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                data-name="collectionDetailPage.addPostModal.submitBtn"
              >
                {submitting ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
