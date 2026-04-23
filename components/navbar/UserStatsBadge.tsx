"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { getLevelMeta } from "@/lib/level";

const fetcher = async (url: string): Promise<{ score: number; level?: string }> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  return response.json();
};

export default function UserStatsBadge() {
  const { data: session, status } = useSession();
  const { data, isLoading } = useSWR(
    status === "authenticated" && session?.user ? "/api/me/reputation" : null,
    fetcher,
    { revalidateOnFocus: true },
  );

  if (status === "loading") return null;
  if (!session?.user) return null;

  const points = Number(data?.score ?? 0);
  const level = String(
    data?.level
      ?? (session.user as { level?: string }).level
      ?? "Bronze",
  );
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
