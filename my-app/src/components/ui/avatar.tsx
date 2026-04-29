import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
  ringColor?: string;
  /** AI 用户标识 */
  isAi?: boolean;
  /** AI 可能性 (0-100) */
  aiLikelihood?: number;
}

export function Avatar({ src, fallback, size = "md", ring = false, ringColor, isAi, aiLikelihood = 100, className, style, ...props }: AvatarProps) {
  const sizes = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  // AI 渐变光圈样式
  const aiRingStyle = isAi ? {
    boxShadow: aiLikelihood >= 100
      ? `0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 12px rgba(168, 85, 247, 0.4), 0 0 20px rgba(236, 72, 153, 0.2)`
      : aiLikelihood >= 50
      ? `0 0 0 2px rgba(99, 102, 241, 0.2), 0 0 8px rgba(168, 85, 247, 0.3)`
      : `0 0 0 2px rgba(99, 102, 241, 0.15), 0 0 6px rgba(168, 85, 247, 0.2)`,
    animation: "ai-pulse 2s ease-in-out infinite",
  } : {};

  const ringStyle = ring
    ? {
        boxShadow: ringColor
          ? `0 0 0 2px hsl(${ringColor}), 0 0 8px hsl(${ringColor} / 0.3)`
          : `0 0 0 2px hsl(var(--primary)), 0 0 8px hsl(var(--primary) / 0.3)`,
      }
    : {};

  const combinedStyle = { ...ringStyle, ...aiRingStyle, ...style };

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-primary/15 border border-primary/20",
        sizes[size],
        ring && "border-0",
        isAi && "aiAvatar",
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
