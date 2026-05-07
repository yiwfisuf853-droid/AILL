import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { FileUpload } from '@/components/ui/FileUpload';
import { usePostsStore } from '@/features/posts/store';
import { PostType, PostOriginalType } from '@/features/posts/types';
import {
  IconEdit, IconVideo, IconPlay, IconQuestion, IconSort, IconLive
} from '@/components/ui/Icon';

const POST_TYPES = [
  { value: PostType.ARTICLE, label: '图文', icon: IconEdit },
  { value: PostType.VIDEO, label: '视频', icon: IconVideo },
  { value: PostType.AUDIO, label: '音频', icon: IconPlay },
  { value: PostType.QUESTION, label: '问答', icon: IconQuestion },
  { value: PostType.POLL, label: '投票', icon: IconSort },
  { value: PostType.LIVE, label: '直播', icon: IconLive },
];

const ORIGINAL_TYPES = [
  { value: PostOriginalType.ORIGINAL, label: '原创' },
  { value: PostOriginalType.RECREATE, label: '二创' },
  { value: PostOriginalType.REPOST, label: '转载' },
  { value: PostOriginalType.ADAPTATION, label: '改编' },
];

export function CreatePostPage() {
  const navigate = useNavigate();
  const { createPost } = usePostsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: PostType.ARTICLE,
    sectionId: '',
    tags: '',
    coverImage: '',
    originalType: PostOriginalType.ORIGINAL,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证
    if (!formData.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!formData.content.trim()) {
      setError('请输入内容');
      return;
    }
    if (!formData.sectionId) {
      setError('请选择分区');
      return;
    }

    try {
      setIsLoading(true);
      const post = await createPost({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        sectionId: formData.sectionId,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        coverImage: formData.coverImage || undefined,
        originalType: formData.originalType,
      });
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError('发布失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="py-3" data-name="createPost">
      <Card data-name="createPostCard">
        <CardHeader>
          <CardTitle data-name="createPostTitle">发布新内容</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md" data-name="createPostError">
                {error}
              </div>
            )}

            {/* 内容类型 */}
            <div className="space-y-2">
              <Label data-name="createPostPostTypeLabel">内容类型</Label>
              <div className="grid grid-cols-3 gap-2" data-name="createPostPostTypes">
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                      data-name={`createPostPostType${type.value}`}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                        formData.type === type.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title" data-name="createPostTitleLabel">标题</Label>
              <Input
                id="title"
                name="title"
                placeholder="请输入标题..."
                value={formData.title}
                onChange={handleChange}
                maxLength={100}
                data-name="createPostTitleInput"
              />
              <p className="text-xs text-muted-foreground text-right" data-name="createPostTitleCount">
                {formData.title.length}/100
              </p>
            </div>

            {/* 分区选择 */}
            <div className="space-y-2">
              <Label htmlFor="sectionId" data-name="createPostSectionLabel">分区</Label>
              <select
                id="sectionId"
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                data-name="createPostSectionSelect"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">选择分区</option>
                <option value="tech">科技</option>
                <option value="game">游戏</option>
                <option value="anime">动漫</option>
                <option value="life">生活</option>
                <option value="ai">AI 创作</option>
              </select>
            </div>

            {/* 原创类型 */}
            <div className="space-y-2">
              <Label data-name="createPostOriginalTypeLabel">原创类型</Label>
              <div className="grid grid-cols-4 gap-2" data-name="createPostOriginalTypes">
                {ORIGINAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    data-name={`createPostOriginalType${type.value}`}
                    onClick={() => setFormData((prev) => ({ ...prev, originalType: type.value }))}
                    className={`p-2 rounded-lg border transition-all text-sm font-medium ${
                      formData.originalType === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容 */}
            <div className="space-y-2">
              <Label htmlFor="content" data-name="createPostContentLabel">内容</Label>
              <MarkdownEditor
                value={formData.content}
                onChange={(v) => setFormData((prev) => ({ ...prev, content: v }))}
                height={350}
              />
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label htmlFor="tags" data-name="createPostTagsLabel">标签</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="用逗号分隔，例如：AI, 绘画，教程"
                value={formData.tags}
                onChange={handleChange}
                data-name="createPostTagsInput"
              />
            </div>

            {/* 封面图 */}
            <div className="space-y-2">
              <Label data-name="createPostCoverLabel">封面图</Label>
              <FileUpload
                value={formData.coverImage}
                onChange={(url) => setFormData((prev) => ({ ...prev, coverImage: url }))}
                placeholder="上传封面图"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} data-name="createPostCancelBtn">
              取消
            </Button>
            <Button type="submit" disabled={isLoading} data-name="createPostSubmitBtn">
              {isLoading ? '发布中...' : '发布'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
