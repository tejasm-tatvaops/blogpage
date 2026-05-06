"use client";

type ExpertiseBadgeProps = {
  badge?: string | null;
  className?: string;
};

export function ExpertiseBadge({ badge, className }: ExpertiseBadgeProps) {
  const text = String(badge ?? "").trim();
  if (!text) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-200 ${className ?? ""}`}
      title={`Expertise: ${text}`}
    >
      {text}
    </span>
  );
}
