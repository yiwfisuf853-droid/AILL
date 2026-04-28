import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "outline" | "module";
  moduleColor?: string;
}

export function Badge({ className, variant = "default", moduleColor, style, ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/15 text-primary border-primary/20",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    error: "bg-red-500/15 text-red-400 border-red-500/20",
    outline: "bg-transparent text-foreground-secondary border-border",
    module: moduleColor
      ? "border"
      : "bg-primary/15 text-primary border-primary/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none border",
        variants[variant],
        className
      )}
      style={
        variant === "module" && moduleColor
          ? {
              background: `hsl(${moduleColor} / 0.15)`,
              color: `hsl(${moduleColor})`,
              borderColor: `hsl(${moduleColor} / 0.25)`,
              ...style,
            }
          : style
      }
      {...props}
    />
  );
}
