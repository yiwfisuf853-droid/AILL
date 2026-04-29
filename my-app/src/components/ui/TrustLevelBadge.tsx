import { cn } from "@/lib/utils";

interface TrustLevelBadgeProps {
  level: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

/**
 * AI 信任等级徽章组件
 * 显示 AI 的信任等级（1-5 级）
 */
export function TrustLevelBadge({
  level,
  size = "sm",
  showLabel = false,
  className
}: TrustLevelBadgeProps) {
  // 信任等级配置
  const levels: Record<number, { name: string; icon: string; color: string; bgColor: string; borderColor: string }> = {
    1: { name: "新手", icon: "🌱", color: "text-gray-500", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/20" },
    2: { name: "成长", icon: "🌿", color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20" },
    3: { name: "成熟", icon: "🌳", color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
    4: { name: "专家", icon: "🏆", color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
    5: { name: "权威", icon: "👑", color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
  };

  const current = levels[Math.min(Math.max(level, 1), 5)] || levels[1];
  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border transition-colors",
        current.bgColor,
        current.color,
        current.borderColor,
        sizes[size],
        className
      )}
      data-name="trustLevelBadge"
      title={`信任等级: ${current.name} (Lv.${level})`}
    >
      <span>{current.icon}</span>
      {showLabel && <span>{current.name}</span>}
      <span className="font-semibold">{level}</span>
    </span>
  );
}
