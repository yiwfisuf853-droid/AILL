import { Link } from 'react-router-dom';
import {
  IconHeart, IconComment, IconShare, IconBookmark, IconEdit, IconDelete, IconStar, IconFlag
} from '@/components/ui/Icon';
import { AiReplyButton } from '@/components/ui/AiReplyButton';
import type { Post } from '@/features/posts/types';

interface PostActionsProps {
  post: Post;
  isOwner: boolean;
  onLike: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  likeAnimating: boolean;
  bookmarkAnimating: boolean;
  onLikeAnimEnd: () => void;
  onBookmarkAnimEnd: () => void;
  onRewardOpen: () => void;
  onReportOpen: () => void;
}

export function PostActions({
  post,
  isOwner,
  onLike,
  onShare,
  onFavorite,
  onDelete,
  likeAnimating,
  bookmarkAnimating,
  onLikeAnimEnd,
  onBookmarkAnimEnd,
  onRewardOpen,
  onReportOpen,
}: PostActionsProps) {
  return (
    <div className="flex items-center justify-between mt-5 pt-3 border-t border-border/40" data-name="postActions">
      {/* 左侧操作 */}
      <div data-name="postActionsLeft" className="flex items-center gap-0.5">
        <button
          onClick={onLike}
          data-name="postActionsLikeBtn"
          className={`actionBtn !gap-1 hover:text-favorite ${post.isLiked ? 'text-favorite' : ''}`}
        >
          <IconHeart
            size={14}
            className={`${post.isLiked ? 'fill-favorite' : ''} ${likeAnimating ? 'animateHeartbeat' : ''}`}
            onAnimationEnd={onLikeAnimEnd}
          />
          <span className="text-xs">{post.likeCount}</span>
        </button>
        <button
          className="actionBtn !gap-1"
          data-name="postActionsCommentBtn"
        >
          <IconComment size={14} />
          <span className="text-xs">{post.commentCount}</span>
        </button>
        <AiReplyButton postId={post.id} className="ml-1" />
      </div>

      {/* 右侧操作 */}
      <div data-name="postActionsRight" className="flex items-center gap-0.5">
        {!isOwner && (
          <>
            <button
              onClick={onRewardOpen}
              data-name="postActionsRewardBtn"
              className="actionBtn !gap-1 hover:text-warning"
            >
              <IconStar size={14} /> <span className="text-xs">打赏</span>
            </button>
            <button
              onClick={onReportOpen}
              data-name="postActionsReportBtn"
              className="actionBtn !gap-1 hover:text-destructive"
            >
              <IconFlag size={14} /> <span className="text-xs">举报</span>
            </button>
          </>
        )}
        {isOwner && (
          <>
            <Link
              to={`/posts/${post.id}/edit`}
              className="actionBtn !gap-1 hover:text-primary"
              data-name="postActionsEditBtn"
            >
              <IconEdit size={14} /> <span className="text-xs">编辑</span>
            </Link>
            <button
              onClick={onDelete}
              data-name="postActionsDeleteBtn"
              className="actionBtn !gap-1 hover:text-destructive"
            >
              <IconDelete size={14} /> <span className="text-xs">删除</span>
            </button>
          </>
        )}
        <button
          onClick={onShare}
          data-name="postActionsShareBtn"
          className="actionBtn !gap-1"
        >
          <IconShare size={14} /> <span className="text-xs">分享</span>
        </button>
        <button
          onClick={onFavorite}
          data-name="postActionsBookmarkBtn"
          className={`actionBtn !gap-1 hover:text-warning ${post.isFavorited ? 'text-warning' : ''}`}
        >
          <IconBookmark
            size={14}
            className={`${post.isFavorited ? 'fill-warning' : ''} ${bookmarkAnimating ? 'animateBookmarkBounce' : ''}`}
            onAnimationEnd={onBookmarkAnimEnd}
          />
          <span className="text-xs">{post.favoriteCount || '收藏'}</span>
        </button>
      </div>
    </div>
  );
}