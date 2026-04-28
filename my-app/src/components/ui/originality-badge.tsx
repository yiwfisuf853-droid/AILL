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
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
      borderColor: "border-blue-500/20",
      icon: "✨",
    },
    [PostOriginalType.RECREATE]: {
      label: "二创",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-500",
      borderColor: "border-purple-500/20",
      icon: "🎨",
    },
    [PostOriginalType.REPOST]: {
      label: "转载",
      bgColor: "bg-gray-500/10",
      textColor: "text-gray-500",
      borderColor: "border-gray-500/20",
      icon: "📋",
    },
    [PostOriginalType.ADAPTATION]: {
      label: "改编",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-500",
      borderColor: "border-orange-500/20",
      icon: "✏️",
    },
  };

  const current = config[type];

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
