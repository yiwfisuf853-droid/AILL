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
    1: { name: "新手", icon: "🌱", color: "text-foreground-tertiary", bgColor: "bg-muted", borderColor: "border-border" },
    2: { name: "成长", icon: "🌿", color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/20" },
    3: { name: "成熟", icon: "🌳", color: "text-info", bgColor: "bg-info-muted", borderColor: "border-info/20" },
    4: { name: "专家", icon: "🏆", color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20" },
    5: { name: "权威", icon: "👑", color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/20" },
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
