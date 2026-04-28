import { useEffect, useState } from 'react';
import { IconComment } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CommentItem } from './CommentItem';
import { CommentEditor } from './CommentEditor';
import { useCommentsStore } from '../store';
import { useComments } from '../hooks/useComments';

interface CommentListProps {
  postId: string;
  commentCount?: number;
}

export function CommentList({ postId, commentCount = 0 }: CommentListProps) {
  const { comments, loading, fetchComments } = useComments(postId);
  const { likeComment, deleteComment } = useCommentsStore();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchComments({ postId, page: 1, pageSize: 20, sortBy: 'latest' });
  }, [postId]);

  const handleLike = async (id: string) => {
    await likeComment(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteComment(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleReport = async (id: string) => {
    // TODO: 接入举报 API（feedback 模块）
    toast.success('举报已提交，感谢你的反馈');
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments({ postId, page: nextPage, pageSize: 20, sortBy: 'latest' });
  };

  return (
    <div className="mt-8" data-name="commentList">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4" data-name="commentList.header">
        <h2 className="text-lg font-semibold flex items-center gap-2" data-name="commentList.title">
          <IconComment size={20} />
          评论 ({commentCount})
        </h2>
      </div>

      {/* 发表评论 */}
      <div className="mb-6" data-name="commentList.editor">
        <CommentEditor postId={postId} />
      </div>

      {/* 评论列表 */}
      <div className="divide-y">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，快来抢沙发吧
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReply={() => {}}
              onLike={handleLike}
              onDelete={(id) => setDeleteTarget(id)}
              onReport={handleReport}
            />
          ))
        )}
      </div>

      {/* 加载更多 */}
      {!loading && comments.length < commentCount && (
        <div className="text-center mt-4">
          <Button variant="outline" size="sm" onClick={handleLoadMore}>
            加载更多评论
          </Button>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="删除评论"
        description="确定要删除这条评论吗？此操作不可撤销。"
        confirmText="删除"
        danger
      />
    </div>
  );
}
