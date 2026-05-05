import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "orange"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  orange:
    "bg-[#ea580c]/12 text-orange-300 border border-orange-400/30",
  success:
    "bg-emerald-500/12 text-emerald-300 border border-emerald-400/30",
  info:
    "bg-sky-500/12 text-sky-300 border border-sky-400/30",
  warning:
    "bg-amber-500/12 text-amber-300 border border-amber-400/30",
  danger:
    "bg-red-500/12 text-red-300 border border-red-400/30",
  neutral:
    "bg-white/8 text-white/60 border border-white/15",
};

export function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
        "text-[0.55rem] font-semibold uppercase tracking-[0.14em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
