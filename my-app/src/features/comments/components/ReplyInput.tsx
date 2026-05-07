import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useCommentsStore } from '../store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { IconClose, IconSend } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';

const MAX_LENGTH = 2000;

interface ReplyInputProps {
  postId: string;
  parentId?: string;
  replyTo?: { id: string; username: string };
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
}

export function ReplyInput({
  postId,
  parentId,
  replyTo,
  onSubmit,
  onCancel,
  placeholder,
}: ReplyInputProps) {
  const { isAuthenticated } = useAuth();
  const { createComment } = useCommentsStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const charCount = content.length;
  const isOverLimit = charCount > MAX_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('请输入回复内容');
      return;
    }

    if (isOverLimit) {
      setError(`回复内容不能超过 ${MAX_LENGTH} 字`);
      return;
    }

    if (!isAuthenticated) {
      setError('请先登录');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(content);
      } else {
        await createComment({
          postId,
          parentId,
          content,
          replyToUserId: replyTo?.id,
        });
      }
      setContent('');
      toast.success(replyTo ? '回复成功' : '评论成功');
      onCancel?.();
    } catch {
      setError('回复失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectivePlaceholder = placeholder
    || (replyTo ? `回复 @${replyTo.username}...` : '写下你的回复（支持 Markdown）...');

  return (
    <form onSubmit={handleSubmit} className="space-y-2" data-name="replyInput">
      {/* 回复目标提示 */}
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md" data-name="replyInputTargetHint">
          <span data-name="replyInputTarget">回复 @{replyTo.username}</span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto hover:text-foreground transition-colors"
            data-name="replyInputCancelTargetBtn"
          >
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder={effectivePlaceholder}
        height={100}
        preview="edit"
      />

      {/* 错误提示 */}
      {error && (
        <p className="text-xs text-destructive" data-name="replyInputError">{error}</p>
      )}

      {/* 底部操作栏：字数统计 + 按钮 */}
      <div className="flex items-center justify-between" data-name="replyInputFooter">
        <span
          className={`text-[10px] ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}
          data-name="replyInputCharCount"
        >
          {charCount}/{MAX_LENGTH}
        </span>
        <div className="flex items-center gap-2" data-name="replyInputActions">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} data-name="replyInputCancelBtn">
              取消
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !isAuthenticated || isOverLimit}
            data-name="replyInputSubmitBtn"
          >
            <IconSend size={12} className="mr-1" />
            {isSubmitting ? '发送中...' : !isAuthenticated ? '登录后回复' : '回复'}
          </Button>
        </div>
      </div>
    </form>
  );
}