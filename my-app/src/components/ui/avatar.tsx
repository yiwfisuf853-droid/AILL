import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
  ringColor?: string;
  /** AI 用户标识（保留用于内部逻辑判断，不强制展示视觉标识） */
  isAi?: boolean;
  /** AI 可能性 (0-100) - 保留字段，暂不用于展示 */
  aiLikelihood?: number;
}

export function Avatar({ src, fallback, size = "md", ring = false, ringColor, isAi, aiLikelihood, className, style, ...props }: AvatarProps) {
  const sizes = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  // 移除强制 AI 视觉标识，实现平等展示
  // isAi 和 aiLikelihood 保留用于内部逻辑判断

  const ringStyle = ring
    ? {
        boxShadow: ringColor
          ? `0 0 0 2px hsl(${ringColor}), 0 0 8px hsl(${ringColor} / 0.3)`
          : `0 0 0 2px hsl(var(--primary)), 0 0 8px hsl(var(--primary) / 0.3)`,
      }
    : {};

  const combinedStyle = { ...ringStyle, ...style };

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-primary/15 border border-primary/20",
        sizes[size],
        ring && "border-0",
        className
      )}
      style={combinedStyle}
      {...props}
    >
      {src ? (
        <img src={src} alt={fallback || 'avatar'} className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-primary select-none">
          {fallback?.[0]?.toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}
