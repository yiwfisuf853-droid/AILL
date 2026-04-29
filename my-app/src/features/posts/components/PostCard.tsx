import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  IconHeart, IconComment, IconEye, IconClock, IconUser, IconFire, IconStar, IconFlag
} from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { OriginalityBadge } from '@/components/ui/OriginalityBadge';
import type { Post } from '@/features/posts/types';
import { cn } from '@/lib/utils';
import { SECTION_MAP } from '@/lib/navConfig';

interface PostCardProps {
  post: Post & {
    authorIsAi?: boolean;
    authorAiLikelihood?: number;
  };
  variant?: 'default' | 'compact';
}

export const PostCard = memo(function PostCard({ post, variant = 'default' }: PostCardProps) {
  const isCompact = variant === 'default';
  const section = SECTION_MAP[post.sectionId];
  const sectionColor = section?.hsl || '210 100% 56%';
  const isAi = post.authorIsAi || false;
  const aiLikelihood = post.authorAiLikelihood || 100;

  return (
    <article data-name={`postCard${post.id}`} className="border border-border rounded-xl overflow-hidden hover:border-border-hover transition-all duration-200">
      <Link to={`/posts/${post.id}`} data-name={`postCard${post.id}Link`} className="block p-3">
        {/* ── Top: Author + Badges ── */}
        <div data-name={`postCard${post.id}Header`} className="flex items-center gap-2 mb-2">
          {/* Avatar */}
          <Avatar
            data-name={`postCard${post.id}Avatar`}
            size="sm"
            src={post.authorAvatar}
            fallback={post.authorName}
            isAi={isAi}
            aiLikelihood={aiLikelihood}
            className="shrink-0"
          />

          {/* Name + Section + Time */}
          <div data-name={`postCard${post.id}Meta`} className="flex items-center gap-1 min-w-0 flex-1">
            <span data-name={`postCard${post.id}AuthorName`} className="text-xs font-medium text-foreground truncate flex items-center gap-1">
              {post.authorName}
            </span>
            <OriginalityBadge type={post.originalType} className="shrink-0" />
            {section && (
              <span
                data-name={`postCard${post.id}Section`}
                className="inlineChip text-[8px] shrink-0"
                style={{ background: `hsl(${sectionColor} / 0.1)`, color: `hsl(${sectionColor})` }}
              >
                {section.name}
              </span>
            )}
            <span data-name={`postCard${post.id}Time`} className="text-foreground-tertiary text-[9px] flex items-center gap-0.5 shrink-0">
              {formatTime(post.createdAt)}
            </span>
          </div>

          {/* Status badges */}
          <div data-name={`postCard${post.id}Badges`} className="ml-auto flex items-center gap-0.5 shrink-0">
            {post.isTop && (
              <span data-name={`postCard${post.id}TopBadge`} className="inlineChip text-[8px] bg-destructive/10 text-destructive border border-destructive/20">
                <IconFlag size={8} /> 置顶
              </span>
            )}
            {post.isHot && (
              <span data-name={`postCard${post.id}HotBadge`} className="inlineChip text-[8px] bg-[hsl(28,90%,50%)]/10 text-[hsl(28,90%,55%)] border border-[hsl(28,90%,50%)]/20">
                <IconFire size={8} /> 热
              </span>
            )}
            {post.isEssence && (
              <span data-name={`postCard${post.id}EssenceBadge`} className="inlineChip text-[8px] bg-[hsl(160,70%,45%)]/10 text-[hsl(160,70%,50%)] border border-[hsl(160,70%,45%)]/20">
                <IconStar size={8} /> 精
              </span>
            )}
          </div>
        </div>

        {/* ── Content Row ── */}
        <div data-name={`postCard${post.id}Body`} className={cn(!isCompact && 'flex gap-3')}>
          <div data-name={`postCard${post.id}Text`} className={cn("flex-1 min-w-0")}>
            <h2 data-name={`postCard${post.id}Title`} className={cn(
              "font-semibold text-foreground group-hover:text-primary transition-colors leading-snug",
              isCompact ? "text-sm line-clamp-1" : "text-sm line-clamp-2"
            )}>
              {post.title}
            </h2>

            {!isCompact && post.summary && (
              <p data-name={`postCard${post.id}Summary`} className="text-xs text-foreground-secondary mt-1 line-clamp-2 leading-relaxed">
                {post.summary}
              </p>
            )}

            {/* Tags */}
            {!isCompact && post.tags?.length > 0 && (
              <div data-name={`postCard${post.id}Tags`} className="flex flex-wrap gap-1 mt-1.5">
                {post.tags.slice(0, 3).map((tag, idx) => (
                  <span key={tag} data-name={`postCard${post.id}Tag${idx + 1}`} className="tagPill text-[9px]">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {!isCompact && post.coverImage && (
            <div data-name={`postCard${post.id}CoverImage`} className="hidden sm:block w-[100px] h-[68px] rounded-lg overflow-hidden shrink-0 bg-muted">
              <img
                src={post.coverImage}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* ── Bottom: Actions ── */}
        <div data-name={`postCard${post.id}Actions`} className="flex items-center gap-0.5 mt-2 pt-1.5 border-t border-border/30 -ml-0.5">
          <span data-name={`postCard${post.id}LikeBtn`} className="actionBtn !gap-0.5 !text-xs">
            <IconHeart size={11} className={post.isLiked ? 'fill-red-400 text-red-400' : ''} /> {post.likeCount}
          </span>
          <span data-name={`postCard${post.id}CommentBtn`} className="actionBtn !gap-0.5 !text-xs">
            <IconComment size={11} /> {post.commentCount}
          </span>
          <span data-name={`postCard${post.id}ViewBtn`} className="actionBtn !gap-0.5 !text-xs ml-auto">
            <IconEye size={11} /> {post.viewCount}
          </span>
        </div>
      </Link>
    </article>
  );
});

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
