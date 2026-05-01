import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconHeart, IconComment, IconMore, IconFlag, IconDelete, IconChevronDown, IconChevronUp } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import type { Comment } from '../types';
import { Button } from '@/components/ui/Button';
import { MarkdownPreview } from '@/components/ui/MarkdownEditor';
import { CommentEditor } from './CommentEditor';
import { cn } from '@/lib/utils';
import { commentApi } from '../api';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { getThumbUrl } from '@/lib/imageUtils';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  onReply?: (comment: Comment) => void;
  onLike?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
}

export function CommentItem({
  comment,
  postId,
  depth = 0,
  onReply,
  onLike,
  onDelete,
  onReport,
}: CommentItemProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [repliesTotal, setRepliesTotal] = useState(comment.replyCount || 0);

  const handleReply = () => {
    setShowReplyEditor(!showReplyEditor);
    if (!showReplyEditor) {
      onReply?.(comment);
    }
  };

  const handleSuccess = () => {
    setShowReplyEditor(false);
    // 回复成功后自动展开并刷新子评论列表，让用户立即看到自己的回复
    setRepliesExpanded(true);
    loadReplies();
  };

  const loadReplies = async () => {
    if (repliesLoading) return;
    setRepliesLoading(true);
    try {
      const res = await commentApi.getCommentReplies(comment.id);
      setReplies(res.list);
      setRepliesTotal(res.total);
    } catch {} finally {
      setRepliesLoading(false);
    }
  };

  const toggleReplies = () => {
    if (!repliesExpanded && replies.length === 0) {
      loadReplies();
    }
    setRepliesExpanded(!repliesExpanded);
  };

  // 最多嵌套3层
  const canNest = depth < 2;

  return (
    <div className={cn('py-4', depth === 0 ? 'border-b last:border-b-0' : '')} data-name={`commentItem${comment.id}`}>
      <div data-name={`commentItem${comment.id}Row`} className="flex items-start gap-3">
        <Link to={`/users/${comment.authorId}`}>
          <Avatar
            size={depth > 0 ? 'xs' : 'sm'}
            src={comment.authorAvatar}
            fallback={comment.authorName}
            className="shrink-0"
          />
        </Link>

        <div data-name={`commentItem${comment.id}Body`} className="flex-1 min-w-0">
          {/* 作者名和时间 */}
          <div data-name={`commentItem${comment.id}Meta`} className="flex items-center gap-2 flex-wrap">
            <Link to={`/users/${comment.authorId}`} className="font-medium text-sm hover:underline flex items-center gap-1" data-name={`commentItem${comment.id}AuthorName`}>
              {comment.authorName}
            </Link>
            {comment.isAuthor && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary" data-name={`commentItem${comment.id}AuthorBadge`}>
                作者
              </span>
            )}
            {comment.isEssence && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600" data-name={`commentItem${comment.id}EssenceBadge`}>
                精华
              </span>
            )}
            {comment.isTop && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600" data-name={`commentItem${comment.id}TopBadge`}>
                置顶
              </span>
            )}
            <span className="text-xs text-muted-foreground" data-name={`commentItem${comment.id}Date`}>
              {new Date(comment.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>

          {/* 回复目标 */}
          {comment.replyToUsername && (
            <p className="text-xs text-muted-foreground mt-1" data-name={`commentItem${comment.id}ReplyTarget`}>
              回复 <Link to={`/users/${comment.replyToUserId}`} className="hover:underline">@{comment.replyToUsername}</Link>
            </p>
          )}

          {/* 评论内容 */}
          <div className={cn('text-sm mt-2 break-words', depth > 0 && 'text-[0.82rem]')} data-name={`commentItem${comment.id}Content`}>
            <MarkdownPreview content={comment.content} />
          </div>

          {/* 评论图片 */}
          {comment.images && comment.images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap" data-name={`commentItem${comment.id}Images`}>
              {comment.images.map((img, idx) => (
                <img
                  key={idx}
                  src={getThumbUrl(img)}
                  alt={`评论图片 ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-md"
                />
              ))}
            </div>
          )}

          {/* 评论操作栏 */}
          <div className="flex items-center gap-4 mt-3" data-name={`commentItem${comment.id}Actions`}>
            <button
              onClick={() => onLike?.(comment.id)}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                comment.isLiked ? "text-red-400 hover:text-red-500" : "text-muted-foreground hover:text-primary"
              )}
              data-name={`commentItem${comment.id}LikeBtn`}
            >
              <IconHeart size={14} className={comment.isLiked ? "fill-red-400" : undefined} />
              {comment.likeCount}
            </button>

            {canNest && (
              <button
                onClick={handleReply}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                data-name={`commentItem${comment.id}ReplyBtn`}
              >
                <IconComment size={14} />
                回复
              </button>
            )}

            {/* 查看 N 条回复 */}
            {repliesTotal > 0 && depth === 0 && (
              <button
                onClick={toggleReplies}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
                data-name={`commentItem${comment.id}ToggleRepliesBtn`}
              >
                {repliesExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                {repliesExpanded ? '收起回复' : `查看 ${repliesTotal} 条回复`}
              </button>
            )}

            {/* 更多操作 */}
            <div data-name={`commentItem${comment.id}MoreMenu`} className="relative">
              <button
                data-name={`commentItem${comment.id}MoreBtn`}
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconMore size={14} />
              </button>

              {showMenu && (
                <div data-name={`commentItem${comment.id}Dropdown`} className="absolute left-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-10 min-w-[120px]">
                  <Button
                    data-name={`commentItem${comment.id}ReportBtn`}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      onReport?.(comment.id);
                      setShowMenu(false);
                    }}
                  >
                    <IconFlag size={14} className="mr-2" />
                    举报
                  </Button>
                  <Button
                    data-name={`commentItem${comment.id}DeleteBtn`}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      onDelete?.(comment.id);
                      setShowMenu(false);
                    }}
                  >
                    <IconDelete size={14} className="mr-2" />
                    删除
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 回复编辑器 */}
          {showReplyEditor && canNest && (
            <div data-name={`commentItem${comment.id}ReplyEditor`} className="mt-3 pl-3 border-l-2 border-primary/30">
              <CommentEditor
                postId={postId}
                parentId={comment.id}
                replyToUserId={comment.authorId}
                replyToUsername={comment.authorName}
                onSuccess={handleSuccess}
                onCancel={() => setShowReplyEditor(false)}
              />
            </div>
          )}

          {/* 子评论列表 */}
          {repliesExpanded && depth === 0 && (
            <div className="mt-3 pl-4 border-l-2 border-border/50 space-y-0" data-name={`commentItem${comment.id}Replies`}>
              {repliesLoading ? (
                <ListSkeleton rows={2} />
              ) : (
                replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    depth={depth + 1}
                    onReply={onReply}
                    onLike={onLike}
                    onDelete={onDelete}
                    onReport={onReport}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
