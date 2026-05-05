"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InputVariant = "default" | "search";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  variant?: InputVariant;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      leftIcon,
      rightSlot,
      variant = "default",
      error,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const heightClass = variant === "search" ? "h-[36px]" : "h-[40px]";

    return (
      <div className="relative w-full">
        {leftIcon && (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
            aria-hidden
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-[12px]",
            "bg-[var(--color-surface)] text-[var(--color-text)]",
            "border border-[var(--color-border)]",
            "text-[0.85rem] placeholder:text-[var(--color-text-faint)]",
            "transition-all duration-150",
            "focus:outline-none focus:border-[#f97316]/50 focus:ring-2 focus:ring-[#f97316]/20",
            heightClass,
            leftIcon ? "pl-9" : "pl-3",
            rightSlot ? "pr-[100px]" : "pr-3",
            error && "border-red-400/60 focus:border-red-400/80 focus:ring-red-400/20",
            className,
          )}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
        {error && (
          <p className="mt-1 text-[0.7rem] text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
