import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconHeart, IconComment, IconMore, IconFlag, IconDelete } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { AiBadge } from '@/components/ui/ai-badge';
import type { Comment } from '../types';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/ui/markdown-editor';
import { CommentEditor } from './CommentEditor';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply?: (comment: Comment) => void;
  onLike?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
}

export function CommentItem({
  comment,
  postId,
  onReply,
  onLike,
  onDelete,
  onReport,
}: CommentItemProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleReply = () => {
    setShowReplyEditor(!showReplyEditor);
    if (!showReplyEditor) {
      onReply?.(comment);
    }
  };

  const handleSuccess = () => {
    setShowReplyEditor(false);
  };

  return (
    <div className={cn('py-4 border-b last:border-b-0')} data-name={`commentItem.${comment.id}`}>
      {/* 评论头部：作者信息 */}
      <div className="flex items-start gap-3">
        <Link to={`/users/${comment.authorId}`}>
          <Avatar
            size="sm"
            src={comment.authorAvatar}
            fallback={comment.authorName}
            isAi={comment.authorIsAi}
            aiLikelihood={comment.authorAiLikelihood}
            className="shrink-0"
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* 作者名和时间 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/users/${comment.authorId}`} className="font-medium text-sm hover:underline flex items-center gap-1" data-name={`commentItem.${comment.id}.authorName`}>
              {comment.authorName}
              {comment.authorIsAi && <AiBadge aiLikelihood={comment.authorAiLikelihood} size="sm" />}
            </Link>
            {comment.isAuthor && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary" data-name={`commentItem.${comment.id}.authorBadge`}>
                作者
              </span>
            )}
            {comment.isEssence && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600" data-name={`commentItem.${comment.id}.essenceBadge`}>
                精华
              </span>
            )}
            {comment.isTop && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-600" data-name={`commentItem.${comment.id}.topBadge`}>
                置顶
              </span>
            )}
            <span className="text-xs text-muted-foreground" data-name={`commentItem.${comment.id}.date`}>
              {new Date(comment.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>

          {/* 回复目标 */}
          {comment.replyToUsername && (
            <p className="text-xs text-muted-foreground mt-1" data-name={`commentItem.${comment.id}.replyTarget`}>
              回复 <Link to={`/users/${comment.replyToUserId}`} className="hover:underline">@{comment.replyToUsername}</Link>
            </p>
          )}

          {/* 评论内容 */}
          <div className="text-sm mt-2 break-words" data-name={`commentItem.${comment.id}.content`}>
            <MarkdownPreview content={comment.content} />
          </div>

          {/* 评论图片 */}
          {comment.images && comment.images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap" data-name={`commentItem.${comment.id}.images`}>
              {comment.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`评论图片 ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-md"
                />
              ))}
            </div>
          )}

          {/* 评论操作栏 */}
          <div className="flex items-center gap-4 mt-3" data-name={`commentItem.${comment.id}.actions`}>
            <button
              onClick={() => onLike?.(comment.id)}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                comment.isLiked ? "text-red-400 hover:text-red-500" : "text-muted-foreground hover:text-primary"
              )}
              data-name={`commentItem.${comment.id}.likeBtn`}
            >
              <IconHeart size={14} className={comment.isLiked ? "fill-red-400" : undefined} />
              {comment.likeCount}
            </button>

            <button
              onClick={handleReply}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-name={`commentItem.${comment.id}.replyBtn`}
            >
              <IconComment size={14} />
              回复
            </button>

            {/* 更多操作 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconMore size={14} />
              </button>

              {showMenu && (
                <div className="absolute left-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-10 min-w-[120px]">
                  <Button
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
          {showReplyEditor && (
            <div className="mt-3 pl-3 border-l-2 border-primary/30">
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
        </div>
      </div>
    </div>
  );
}
