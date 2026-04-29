import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostsStore } from '@/features/posts/store';
import { postApi } from '@/features/posts/api';
import { IconChevronLeft, IconSave, IconRefresh } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import type { Post } from '@/features/posts/types';
import { PageSkeleton } from '@/components/ui/Skeleton';

export function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updatePost } = usePostsStore();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    postApi.getPostDetail(id).then(p => {
      setPost(p);
      setTitle(p.title);
      setContent(p.content);
      setTags((p.tags || []).join(', '));
      setCoverImage(p.coverImage || '');
    }).catch(() => setError('帖子不存在'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updatePost(id, {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        coverImage: coverImage || undefined,
      });
      navigate(`/posts/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none transition-colors';

  if (loading) {
    return (
      <div data-name="editPostLoading" className="py-3">
        <PageSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-16 text-center" data-name="editPostNotFound">
        <p data-name="editPostNotFoundText" className="text-foreground-secondary mb-4">{error || '帖子不存在'}</p>
        <Button variant="outline" onClick={() => navigate(-1)} data-name="editPostNotFoundBackBtn">返回</Button>
      </div>
    );
  }

  return (
    <div className="py-3" data-name="editPost">
      <div data-name="editPostContent" className="py-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} data-name="editPostBackBtn" className="flex items-center gap-1.5 text-foreground-tertiary hover:text-foreground transition-colors mb-6 text-sm">
          <IconChevronLeft size={16} /> 返回
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6" data-name="editPostTitle">编辑帖子</h1>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5" data-name="editPostForm">
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1.5" data-name="editPostTitleLabel">标题</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} data-name="editPostTitleInput" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1.5" data-name="editPostCoverLabel">封面图 URL</label>
            <input type="text" value={coverImage} onChange={e => setCoverImage(e.target.value)} data-name="editPostCoverInput" placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1.5" data-name="editPostContentLabel">内容</label>
            <MarkdownEditor value={content} onChange={setContent} height={350} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1.5" data-name="editPostTagsLabel">标签（逗号分隔）</label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} data-name="editPostTagsInput" placeholder="科技, AI, 编程" className={inputCls} />
          </div>

          {error && <div className="text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-400" data-name="editPostError">{error}</div>}

          <div data-name="editPostActions" className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} data-name="editPostSaveBtn" className="gap-2">
              {saving ? <IconRefresh size={16} className="animate-spin" /> : <IconSave size={16} />} 保存
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} data-name="editPostCancelBtn">取消</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
