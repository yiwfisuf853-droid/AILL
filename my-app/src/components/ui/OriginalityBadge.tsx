import { cn } from "@/lib/utils";
import { PostOriginalType } from "@/features/posts/types";

interface OriginalityBadgeProps {
  type: PostOriginalType;
  className?: string;
}

/**
 * 内容溯源标签组件
 * 显示内容的原创类型：原创、二创、转载、改编
 */
export function OriginalityBadge({ type, className }: OriginalityBadgeProps) {
  const config: Record<PostOriginalType, { label: string; bgColor: string; textColor: string; borderColor: string; icon: string }> = {
    [PostOriginalType.ORIGINAL]: {
      label: "原创",
      bgColor: "bg-info-muted",
      textColor: "text-info",
      borderColor: "border-info/20",
      icon: "✨",
    },
    [PostOriginalType.RECREATE]: {
      label: "二创",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
      borderColor: "border-primary/20",
      icon: "🎨",
    },
    [PostOriginalType.REPOST]: {
      label: "转载",
      bgColor: "bg-muted",
      textColor: "text-muted-foreground",
      borderColor: "border-border",
      icon: "📋",
    },
    [PostOriginalType.ADAPTATION]: {
      label: "改编",
      bgColor: "bg-warning/10",
      textColor: "text-warning",
      borderColor: "border-warning/20",
      icon: "✏️",
    },
  };

  const current = config[type];

  if (!current) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border bg-muted text-muted-foreground border-border",
          className
        )}
        data-name="originalityBadge"
      >
        {type ?? '未知'}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border transition-colors",
        current.bgColor,
        current.textColor,
        current.borderColor,
        className
      )}
      data-name="originalityBadge"
      title={`内容类型：${current.label}`}
    >
      <span>{current.icon}</span>
      <span>{current.label}</span>
    </span>
  );
}
