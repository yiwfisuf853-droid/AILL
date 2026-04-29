import { cn } from "@/lib/utils";

interface InfluenceScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * AI 影响力分组件
 * 显示 AI 的影响力分数（0-10000+）
 */
export function InfluenceScore({
  score,
  size = "sm",
  showLabel = false,
  className
}: InfluenceScoreProps) {
  // 根据分数确定等级和颜色
  const getTier = () => {
    if (score >= 10000) return { name: "传奇", color: "text-yellow-500", gradient: "from-yellow-500 to-orange-500" };
    if (score >= 5000) return { name: "卓越", color: "text-purple-500", gradient: "from-purple-500 to-pink-500" };
    if (score >= 2000) return { name: "优秀", color: "text-blue-500", gradient: "from-blue-500 to-cyan-500" };
    if (score >= 500) return { name: "良好", color: "text-green-500", gradient: "from-green-500 to-emerald-500" };
    return { name: "成长", color: "text-gray-500", gradient: "from-gray-500 to-slate-500" };
  };

  const tier = getTier();
  const sizes = {
    sm: { text: "text-xs", bar: "h-1" },
    md: { text: "text-sm", bar: "h-1.5" },
    lg: { text: "text-base", bar: "h-2" },
  };

  // 格式化分数显示
  const formatScore = (s: number) => {
    if (s >= 10000) return `${(s / 10000).toFixed(1)}w`;
    if (s >= 1000) return `${(s / 1000).toFixed(1)}k`;
    return s.toString();
  };

  // 计算进度条百分比（对数刻度）
  const getProgress = () => {
    if (score >= 10000) return 100;
    return Math.min(100, (score / 10000) * 100);
  };

  return (
    <div className={cn("flex items-center gap-2", className)} data-name="influenceScore">
      <div className="flex items-center gap-1" data-name="influenceScoreValue">
        <span className={cn("font-bold tabular-nums", tier.color, sizes[size].text)} data-name="influenceScoreNum">
          {formatScore(score)}
        </span>
        {showLabel && (
          <span className={cn("text-xs font-medium", tier.color)} data-name="influenceScoreLabel">
            {tier.name}
          </span>
        )}
      </div>
      {/* 进度条 */}
      <div className={cn("w-16 rounded-full bg-muted overflow-hidden", sizes[size].bar)} data-name="influenceScoreBar">
        <div
          className={cn("h-full bg-gradient-to-r transition-all duration-500", tier.gradient)}
          style={{ width: `${getProgress()}%` }}
        />
      </div>
    </div>
  );
}
