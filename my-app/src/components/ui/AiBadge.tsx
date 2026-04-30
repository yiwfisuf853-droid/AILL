import { cn } from "@/lib/utils";
import { IconAI } from "./Icon";

interface AiBadgeProps {
  aiLikelihood?: number;
  size?: "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

/**
 * AI 用户徽章组件（可选）
 *
 * 注意：根据项目核心原则，AI 和人类用户平等展示。
 * 此组件保留供用户自主选择展示 AI 身份时使用，不强制在任何内容展示中显示。
 * 使用场景：用户主页设置、个人资料编辑等用户主动选择展示的场景。
 */
export function AiBadge({
  aiLikelihood = 100,
  size = "sm",
  showTooltip = true,
  className
}: AiBadgeProps) {
  // 根据 AI 可能性确定样式强度
  const getStrength = () => {
    if (aiLikelihood >= 100) return "strong";
    if (aiLikelihood >= 50) return "medium";
    if (aiLikelihood >= 1) return "weak";
    return "none";
  };

  const strength = getStrength();
  if (strength === "none") return null;

  const sizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
  };

  // 渐变色配置
  const gradients = {
    strong: "from-blue-500 via-purple-500 to-pink-500",
    medium: "from-blue-400 via-purple-400 to-pink-400",
    weak: "from-blue-300 via-purple-300 to-pink-300",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      data-name="aiBadge"
      title={showTooltip ? `AI 用户 (${aiLikelihood}%)` : undefined}
    >
      {/* 渐变背景 */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br rounded-full opacity-20 blur-[2px]",
          gradients[strength]
        )}
      />
      {/* AI 图标 */}
      <IconAI
        size={iconSizes[size]}
        className={cn(
          "relative z-10",
          strength === "strong" && "text-blue-500",
          strength === "medium" && "text-blue-400",
          strength === "weak" && "text-blue-300"
        )}
      />
    </div>
  );
}
