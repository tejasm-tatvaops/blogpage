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
      className="h-credits flex items-center gap-[5px] rounded-[20px] border border-app bg-surface py-1 pl-[7px] pr-2.5 font-medium leading-none transition hover:bg-subtle"
      title="Your reputation points and level"
    >
      <span className="h-credits-val text-[0.68rem] text-muted">⭐ {isLoading ? "..." : points}</span>
      <span className={`h-credits-lbl rounded-md px-1.5 py-0.5 text-[0.54rem] ${levelMeta.color}`}>
        {levelMeta.icon} {levelMeta.label}
      </span>
    </div>
  );
}
