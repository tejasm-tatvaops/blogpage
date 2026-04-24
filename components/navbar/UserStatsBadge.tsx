"use client";

import { getLevelMeta } from "@/lib/level";
import { useMe } from "@/hooks/useMe";

export default function UserStatsBadge() {
  const { data, isLoading } = useMe();
  const sessionUser = data?.session?.user;
  if (!sessionUser) return null;

  const points = Number(data?.reputation?.score ?? 0);
  const level = String(data?.reputation?.level ?? sessionUser.level ?? "Bronze");
  const levelMeta = getLevelMeta(level);

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-app bg-surface px-3 py-1 transition hover:bg-subtle"
      title="Your reputation points and level"
    >
      <span className="flex items-center gap-1 text-sm font-medium text-muted">
        ⭐ {isLoading ? "..." : points}
      </span>
      <span className={`rounded px-2 py-0.5 text-xs ${levelMeta.color}`}>
        {levelMeta.icon} {levelMeta.label}
      </span>
    </div>
  );
}
