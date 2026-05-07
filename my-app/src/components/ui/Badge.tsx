import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

export function Badge({ className, variant = "default", style, ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/15 text-primary border-primary/20",
    success: "bg-success-muted text-success border-success/20",
    warning: "bg-warning-muted text-warning border-warning/20",
    error: "bg-destructive/15 text-destructive border-destructive/20",
    info: "bg-info-muted text-info border-info/20",
    outline: "bg-transparent text-foreground-secondary border-border",
  };

  return (
    <span
      data-name="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-none border",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
