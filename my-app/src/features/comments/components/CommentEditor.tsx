import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useCommentsStore } from '../store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { IconClose } from '@/components/ui/Icon';

interface CommentEditorProps {
  postId: string;
  parentId?: string;
  replyToUserId?: string;
  replyToUsername?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommentEditor({
  postId,
  parentId,
  replyToUserId,
  replyToUsername,
  onSuccess,
  onCancel,
}: CommentEditorProps) {
  const { isAuthenticated } = useAuth();
  const { createComment } = useCommentsStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('请输入评论内容');
      return;
    }

    if (!isAuthenticated) {
      setError('请先登录');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({
        postId,
        parentId,
        content,
        replyToUserId,
      });
      setContent('');
      onSuccess?.();
      onCancel?.();
    } catch {
      setError('评论失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-name="commentEditor">
      {replyToUsername && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md" data-name="commentEditorReplyHint">
          <span data-name="commentEditorReplyTarget">回复 @{replyToUsername}</span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto hover:text-foreground"
            data-name="commentEditorCancelReplyBtn"
          >
            <IconClose size={16} />
          </button>
        </div>
      )}

      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder={replyToUsername ? `回复 @${replyToUsername}...` : '写下你的评论（支持 Markdown）...'}
        height={150}
        preview="edit"
      />

      {error && (
        <p className="text-sm text-destructive" data-name="commentEditorError">{error}</p>
      )}

      <div className="flex justify-end gap-2" data-name="commentEditorActions">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} data-name="commentEditorCancelBtn">
            取消
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !isAuthenticated} data-name="commentEditorSubmitBtn">
          {isSubmitting ? '发送中...' : !isAuthenticated ? '登录后评论' : '发表评论'}
        </Button>
      </div>
    </form>
  );
}
