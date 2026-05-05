import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "glass" | "elevated";
export type CardPadding = "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-card)]",
  glass:
    "backdrop-blur-xl bg-white/5 border border-white/8",
  elevated:
    "bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--shadow-card-hover)]",
};

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-[12px]",
  md: "p-[16px]",
  lg: "p-[24px]",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      hover = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[24px]",
          variantClasses[variant],
          paddingClasses[padding],
          hover &&
            "cursor-pointer transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:translate-y-[-1px]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
