"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
}

export function Toggle({ label, className, id, ...props }: ToggleProps) {
  const inputId = id ?? "toggle";

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2.5",
        className,
      )}
    >
      <span className="relative inline-block" style={{ width: 42, height: 23 }}>
        <input
          type="checkbox"
          id={inputId}
          className="peer sr-only"
          {...props}
        />
        {/* Track */}
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-[var(--color-border)] transition-colors duration-200",
            "peer-checked:bg-[#ea580c]",
          )}
        />
        {/* Thumb */}
        <span
          className={cn(
            "absolute top-[3px] left-[3px]",
            "h-[17px] w-[17px] rounded-full bg-white shadow-sm",
            "transition-transform duration-200",
            "peer-checked:translate-x-[19px]",
          )}
        />
      </span>
      {label && (
        <span className="text-[0.72rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          {label}
        </span>
      )}
    </label>
  );
}
