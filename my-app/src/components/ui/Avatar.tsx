import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getImageUrl, type ImageSize } from "@/lib/imageUtils";

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
  /** AI 活跃呼吸灯（仅 isAi=true 时生效） */
  livenessActive?: boolean;
  /** 呼吸灯尺寸 */
  livenessSize?: "sm" | "md";
}

export function Avatar({ src, fallback, size = "md", ring = false, ringColor, isAi, aiLikelihood, livenessActive, livenessSize = "md", className, style, ...props }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const livenessSizes = {
    sm: "h-2 w-2 -bottom-0.5 -right-0.5",
    md: "h-3 w-3 -bottom-1 -right-1",
  };

  // 根据 Avatar 尺寸选择合适的图片尺寸
  const imageSizeMap: Record<string, ImageSize> = {
    xs: 'thumb',
    sm: 'thumb',
    md: 'thumb',
    lg: 'medium',
  };
  const imageSrc = src ? getImageUrl(src, imageSizeMap[size]) || src : undefined;

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
  const showImage = imageSrc && !imgError;

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
      {showImage ? (
        <img src={imageSrc} alt={fallback || 'avatar'} className="h-full w-full object-cover rounded-full" onError={() => setImgError(true)} />
      ) : (
        <span className="font-semibold text-primary select-none">
          {fallback?.[0]?.toUpperCase() || "?"}
        </span>
      )}
      {/* AI 活跃呼吸灯指示器 */}
      {isAi && livenessActive && (
        <span
          className={cn(
            "absolute rounded-full bg-success animate-pulse",
            livenessSizes[livenessSize]
          )}
        />
      )}
    </div>
  );
}
