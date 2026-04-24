"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useSession } from "next-auth/react";

type FollowButtonProps = {
  targetIdentityKey: string;
  variant?: "default" | "compact";
  onFollowerCountChange?: Dispatch<SetStateAction<number>>;
};

type FollowStatsResponse = {
  followers: number;
  following: number;
  isFollowing: boolean;
};

const FOLLOW_STATS_TTL_MS = 30_000;
const followStatsCache = new Map<string, { data: FollowStatsResponse; ts: number }>();
const followStatsInFlight = new Map<string, Promise<FollowStatsResponse>>();
const queuedIdentityKeys = new Set<string>();
const queuedResolvers = new Map<
  string,
  Array<{ resolve: (value: FollowStatsResponse) => void; reject: (reason?: unknown) => void }>
>();
let queuedFlushTimer: ReturnType<typeof setTimeout> | null = null;

const defaultStats: FollowStatsResponse = { followers: 0, following: 0, isFollowing: false };

const isFollowableIdentity = (identityKey: string): boolean => {
  const key = String(identityKey ?? "").trim().toLowerCase();
  if (!key) return false;
  if (key.startsWith("author:")) return false;
  if (key.startsWith("legacy:")) return false;
  return true;
};

const flushFollowStatsBatch = async () => {
  const keys = [...queuedIdentityKeys];
  queuedIdentityKeys.clear();
  queuedFlushTimer = null;
  if (keys.length === 0) return;

  try {
    const response = await fetch("/api/users/follow-stats/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityKeys: keys }),
    });
    if (!response.ok) {
      throw new Error("Batch follow-stats request failed");
    }
    const payload = (await response.json()) as { stats?: Record<string, FollowStatsResponse> };
    const statsByKey = payload.stats ?? {};
    for (const key of keys) {
      const resolvers = queuedResolvers.get(key) ?? [];
      queuedResolvers.delete(key);
      const stats = statsByKey[key] ?? defaultStats;
      resolvers.forEach(({ resolve }) => resolve(stats));
    }
  } catch (error) {
    for (const key of keys) {
      const resolvers = queuedResolvers.get(key) ?? [];
      queuedResolvers.delete(key);
      resolvers.forEach(({ reject }) => reject(error));
    }
  }
};

const enqueueFollowStatsBatch = (targetIdentityKey: string): Promise<FollowStatsResponse> =>
  new Promise((resolve, reject) => {
    const bucket = queuedResolvers.get(targetIdentityKey) ?? [];
    bucket.push({ resolve, reject });
    queuedResolvers.set(targetIdentityKey, bucket);
    queuedIdentityKeys.add(targetIdentityKey);

    if (!queuedFlushTimer) {
      queuedFlushTimer = setTimeout(() => {
        void flushFollowStatsBatch();
      }, 20);
    }
  });

export function FollowButton({
  targetIdentityKey,
  variant = "default",
  onFollowerCountChange,
}: FollowButtonProps) {
  const { data: session } = useSession();
  const viewerIdentityKey = session?.user?.id ? `google:${session.user.id}` : "";
  const isSelf = viewerIdentityKey !== "" && viewerIdentityKey === targetIdentityKey;
  const isFollowable = isFollowableIdentity(targetIdentityKey);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || !targetIdentityKey || isSelf || !isFollowable) return;
    let cancelled = false;
    const run = async () => {
      try {
        const cacheKey = `${viewerIdentityKey}::${targetIdentityKey}`;
        const now = Date.now();
        const cached = followStatsCache.get(cacheKey);
        if (cached && now - cached.ts < FOLLOW_STATS_TTL_MS) {
          if (!cancelled) {
            setIsFollowing(Boolean(cached.data.isFollowing));
            if (typeof cached.data.followers === "number") onFollowerCountChange?.(cached.data.followers);
          }
          return;
        }

        const existingPromise = followStatsInFlight.get(cacheKey);
        const requestPromise = existingPromise ?? enqueueFollowStatsBatch(targetIdentityKey);
        if (!existingPromise) {
          followStatsInFlight.set(cacheKey, requestPromise);
        }
        const payload = await requestPromise;
        followStatsCache.set(cacheKey, { data: payload, ts: now });
        if (!cancelled) {
          setIsFollowing(Boolean(payload.isFollowing));
          if (typeof payload.followers === "number") onFollowerCountChange?.(payload.followers);
        }
      } catch {
        // Fail soft: keep existing UI state.
      } finally {
        const cacheKey = `${viewerIdentityKey}::${targetIdentityKey}`;
        followStatsInFlight.delete(cacheKey);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isFollowable, isSelf, onFollowerCountChange, session?.user?.id, targetIdentityKey, viewerIdentityKey]);

  const className = useMemo(() => {
    if (variant === "compact") {
      return isFollowing
        ? "rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        : "rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
    }
    return isFollowing
      ? "rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
  }, [isFollowing, variant]);

  if (!targetIdentityKey || !session?.user?.id || isSelf || !isFollowable) return null;

  const label = loading
    ? "..."
    : isFollowing
      ? (hovering ? "Unfollow" : "Following")
      : "Follow";

  return (
    <button
      type="button"
      disabled={loading}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={className}
      onClick={async () => {
        if (loading) return;
        const previous = isFollowing;
        const next = !previous;
        setIsFollowing(next);
        setLoading(true);
        if (onFollowerCountChange) {
          onFollowerCountChange((count) => Math.max(0, count + (next ? 1 : -1)));
        }
        try {
          const response = await fetch("/api/users/follow", {
            method: next ? "POST" : "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetIdentityKey }),
          });
          if (!response.ok) throw new Error("Follow request failed");
          const payload = (await response.json()) as { followers?: number; isFollowing?: boolean };
          const resolvedIsFollowing = typeof payload.isFollowing === "boolean" ? payload.isFollowing : next;
          if (typeof payload.isFollowing === "boolean") setIsFollowing(payload.isFollowing);
          if (typeof payload.followers === "number") onFollowerCountChange?.(payload.followers);
          const cacheKey = `${viewerIdentityKey}::${targetIdentityKey}`;
          const existing = followStatsCache.get(cacheKey)?.data ?? defaultStats;
          followStatsCache.set(cacheKey, {
            data: {
              followers: typeof payload.followers === "number" ? payload.followers : existing.followers,
              following: existing.following,
              isFollowing: resolvedIsFollowing,
            },
            ts: Date.now(),
          });
        } catch {
          setIsFollowing(previous);
          if (onFollowerCountChange) {
            onFollowerCountChange((count) => Math.max(0, count + (previous ? 1 : -1)));
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {label}
    </button>
  );
}
