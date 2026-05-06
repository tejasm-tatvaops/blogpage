"use client";

import { useEffect, useMemo, useState } from "react";

type LiveActivityPulseProps = {
  baseCount: number;
  noun?: string;
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function LiveActivityPulse({
  baseCount,
  noun = "builders active",
  className,
}: LiveActivityPulseProps) {
  const safeBase = Math.max(1, Math.round(baseCount));
  const [count, setCount] = useState(safeBase);

  useEffect(() => {
    setCount(safeBase);
  }, [safeBase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const delta = Math.floor(Math.random() * 3) + 1;
      const direction = Math.random() > 0.52 ? 1 : -1;
      setCount((current) => clamp(current + delta * direction, Math.max(1, safeBase - 3), safeBase + 3));
    }, 18000 + Math.floor(Math.random() * 8000));

    return () => window.clearInterval(timer);
  }, [safeBase]);

  const label = useMemo(() => `${count} ${noun}`, [count, noun]);

  return (
    <div
      className={`inline-flex items-center gap-2 text-[11px] tracking-wide text-slate-500 transition duration-200 hover:text-slate-700 dark:text-white/55 dark:hover:text-white/80 ${className ?? ""}`}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500/80 shadow-[0_0_6px_rgba(249,115,22,0.25)]"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
