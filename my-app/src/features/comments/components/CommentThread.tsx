import { useState, useEffect } from 'react';
import { IconComment, IconRefresh } from '@/components/ui/Icon';
import { CommentList } from './CommentList';
import { useCommentsStore } from '../store';
import { useSocket } from '@/hooks/useSocket';
import type { Comment } from '../types';

interface CommentThreadProps {
  postId: string;
  commentCount: number;
}

export function CommentThread({ postId, commentCount }: CommentThreadProps) {
  const [hasNewComment, setHasNewComment] = useState(false);
  const { addRealtimeComment } = useCommentsStore();
  const { on } = useSocket();

  // 监听实时评论
  useEffect(() => {
    if (!postId) return;
    const cleanup = on('new-comment', (data: { postId: string; comment: Comment }) => {
      if (data.postId === postId) {
        addRealtimeComment(data.comment);
        setHasNewComment(true);
      }
    });
    return cleanup;
  }, [on, postId, addRealtimeComment]);

  const handleRefresh = () => {
    setHasNewComment(false);
    // 滚动到评论列表顶部
    const el = document.querySelector('[data-name="commentThread"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mt-4" data-name="commentThread">
      {/* 评论区域标题 */}
      <div className="flex items-center justify-between mb-3" data-name="commentThreadHeader">
        <h2 className="text-base font-semibold flex items-center gap-2" data-name="commentThreadTitle">
          <IconComment size={18} />
          评论 ({commentCount})
        </h2>

        {/* 实时评论提示 */}
        {hasNewComment && (
          <button
            onClick={handleRefresh}
            data-name="commentThreadRefreshBtn"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            <IconRefresh size={12} />
            有新评论
          </button>
        )}
      </div>

      {/* 嵌套回复视觉层级容器 */}
      <div
        className="relative pl-0 border-l-2 border-primary/10"
        data-name="commentThreadContent"
      >
        <CommentList postId={postId} commentCount={commentCount} />
      </div>
    </div>
  );
}