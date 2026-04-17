/**
 * Feed Cache
 * ──────────
 * In-process LRU cache for pre-ranked feed payloads.
 *
 * WHY IN-PROCESS (not Redis)?
 * ───────────────────────────
 * Vercel serverless functions are stateless — each invocation is a fresh Node.js
 * process.  An in-process cache still delivers a massive win:
 *   • First request for a given identity: cold hit → build feed (200-600ms)
 *   • Subsequent requests within 3 min on the SAME lambda: warm hit (<1ms)
 *   • Across lambda instances: each builds its own warm copy after first request
 *
 * For a Redis layer: swap set/get for `ioredis` calls — the interface below is
 * identical so the feed route needs zero changes.
 *
 * INVALIDATION
 * ─────────────
 * Call  invalidateFeedCache(identityKey)  after:
 *   • user likes a post              (taste signal changed)
 *   • user creates a forum post      (interest updated)
 *   • user updates their profile     (display info changed)
 *
 * TTL
 * ───
 * FEED_TTL_MS = 3 minutes (180 s).
 * After TTL the next request rebuilds the feed transparently.
 * This is short enough that a fresh like re-personalises quickly.
 *
 * LRU EVICTION
 * ─────────────
 * MAX_ENTRIES = 2000.  Each entry ≈ 3KB serialised.
 * Total in-process footprint ≤ ~6MB — negligible on any serverless plan.
 */

import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessed: number;
};

const FEED_TTL_MS  = 3 * 60 * 1000;   // 3 minutes
const MAX_ENTRIES  = 2_000;

class LruCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttlMs = FEED_TTL_MS): void {
    if (this.store.size >= MAX_ENTRIES) this.evictOldest();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Delete all entries whose key starts with `prefix`. */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  private evictOldest(): void {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey  = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}

// Module-level singleton (persists across requests in the same lambda instance)
const feedCache = new LruCache<string>(); // local fallback cache

/**
 * Build the cache key for a user's feed page.
 * Different pages and category filters are cached independently.
 */
export const feedCacheKey = (
  identityKey: string,
  page: number,
  limit: number,
  category?: string,
): string => `feed:${identityKey}:p${page}:l${limit}:c${category ?? "_all"}`;

const redisReady = async () => {
  if (process.env.NODE_ENV === "development") return null;
  const client = getRedisClient();
  if (!client) return null;
  // Never block feed requests waiting for Redis in request path.
  if (client.status === "ready") return client;
  if (client.status === "end" || client.status === "close") return null;
  return null;
};

const deleteKeysByScan = async (
  redis: NonNullable<Awaited<ReturnType<typeof redisReady>>>,
  match: string,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const pendingDeletes: Array<Promise<unknown>> = [];
    const stream = redis.scanStream({ match, count: 200 });
    stream.on("data", (keys: string[]) => {
      if (keys.length > 0) pendingDeletes.push(redis.del(...keys));
    });
    stream.on("error", reject);
    stream.on("end", () => {
      void Promise.allSettled(pendingDeletes).then(() => resolve());
    });
  });

/**
 * Read a cached feed result.  Returns null on miss or expiry.
 */
export const getCachedFeed = async <T>(key: string): Promise<T | null> => {
  const local = feedCache.get(key);
  if (local) {
    try {
      return JSON.parse(local) as T;
    } catch {
      return null;
    }
  }

  const redis = await redisReady();
  let raw: string | null = null;
  if (redis) {
    try {
      raw = await Promise.race<string | null>([
        redis.get(key),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 150)),
      ]);
    } catch (error) {
      logger.debug({ error }, "Redis get failed, using local feed cache");
      raw = null;
    }
  }
  if (!raw) return null;
  try {
    feedCache.set(key, raw);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Write a feed result to cache.
 */
export const setCachedFeed = async (key: string, value: unknown): Promise<void> => {
  try {
    const payload = JSON.stringify(value);
    const redis = await redisReady();
    if (redis) {
      void Promise.race([
        redis.set(key, payload, "PX", FEED_TTL_MS),
        new Promise((resolve) => setTimeout(resolve, 150)),
      ]).catch(() => undefined);
    }
    feedCache.set(key, payload);
  } catch {
    // Serialisation failure (e.g. circular reference) — skip caching silently
  }
};

/**
 * Invalidate ALL cached pages for a given identity.
 * Call this after any action that changes the user's persona or taste signals.
 */
export const invalidateFeedCache = async (identityKey: string): Promise<void> => {
  const redis = await redisReady();
  if (redis) {
    await deleteKeysByScan(redis, `feed:${identityKey}:*`);
    return;
  }
  feedCache.deleteByPrefix(`feed:${identityKey}:`);
};

/**
 * Invalidate cached feeds for ALL users.
 * Use when a new post is published that should appear in trending/exploration.
 */
export const invalidateAllFeeds = async (): Promise<void> => {
  const redis = await redisReady();
  if (redis) {
    await deleteKeysByScan(redis, "feed:*");
    return;
  }
  feedCache.deleteByPrefix("feed:");
};
