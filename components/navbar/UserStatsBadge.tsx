"use client";

import { useSession } from "next-auth/react";
import { getLevelMeta } from "@/lib/level";

export default function UserStatsBadge() {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) return null;

  const points = Number((session.user as { points?: number }).points ?? 0);
  const level = String((session.user as { level?: string }).level ?? "Bronze");
  const levelMeta = getLevelMeta(level);

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-app bg-surface px-3 py-1 transition hover:bg-subtle"
      title="Your reputation points and level"
    >
      <span className="flex items-center gap-1 text-sm font-medium text-muted">⭐ {points}</span>
      <span className={`rounded px-2 py-0.5 text-xs ${levelMeta.color}`}>
        {levelMeta.icon} {levelMeta.label}
      </span>
    </div>
  );
}
