import * as React from "react";

import { cn } from "@/lib/utils";

// ═══ Card 基础 ═══

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-name="card"
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

// ═══ Card 交互态（点击/悬停反馈） ═══

export interface CardInteractiveProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否可点击（添加 hover/active 态） */
  interactive?: boolean;
}

const CardInteractive = React.forwardRef<HTMLDivElement, CardInteractiveProps>(
  ({ className, interactive = true, ...props }, ref) => (
    <div
      ref={ref}
      data-name="cardInteractive"
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
        interactive && "cursor-pointer hover:border-border-hover hover:shadow-card-hover hover:-translate-y-px active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
);
CardInteractive.displayName = "CardInteractive";

// ═══ Card 子组件 ═══

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-name="cardHeader"
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-name="cardTitle"
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-name="cardDescription"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-name="cardContent" className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-name="cardFooter"
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardInteractive, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };