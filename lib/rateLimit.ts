import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

type RateLimiterOptions = {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
};

type Limiter = (key: string) => RateLimitResult;

export const createRateLimiter = ({ limit, windowMs }: RateLimiterOptions): Limiter => {
  const cache = new LRUCache<string, number[]>({ max: 10_000 });

  return (key: string): RateLimitResult => {
    const now = Date.now();
    const timestamps = cache.get(key) ?? [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);
    cache.set(key, recent);

    const oldest = recent[0] ?? now;
    const resetMs = oldest + windowMs;

    return {
      allowed: recent.length <= limit,
      remaining: Math.max(0, limit - recent.length),
      limit,
      resetMs,
    };
  };
};

export const checkRedisRateLimit = async (
  key: string,
  { limit, windowMs }: RateLimiterOptions,
  options?: { failClosed?: boolean },
): Promise<RateLimitResult | null> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    if (!options?.failClosed) return null;
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetMs: Date.now() + windowMs,
    };
  }

  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / windowMs)}`;
  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.pexpire(bucketKey, windowMs);
  }

  const ttlMs = Math.max(0, Number(await redis.pttl(bucketKey)));
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetMs: Date.now() + ttlMs,
  };
};

/** Per-route limiters — shared across requests via module-level singletons. */
export const generateBlogLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const bulkGenerateLimiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
export const adminApiLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const commentLimiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
export const upvoteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const downvoteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
// Anti-gaming: hard cap on total likes per identity per minute across all posts
export const likeAntiGamingLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

// Forum-specific limiters
export const forumPostLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
export const forumVoteLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
export const forumCommentLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/**
 * Returns the best available identifier for rate-limiting a request.
 * Tries CF-Connecting-IP, X-Forwarded-For, then falls back to "anonymous".
 */
export const getRateLimitKey = (req: NextRequest | Request): string => {
  const headers =
    req instanceof NextRequest ? req.headers : (req as Request).headers;

  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
};

/** Standard X-RateLimit-* headers to attach to any response. */
export const rateLimitHeaders = (result: RateLimitResult): Record<string, string> => ({
  "X-RateLimit-Limit": String(result.limit),
  "X-RateLimit-Remaining": String(result.remaining),
  "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
});

export const rateLimitResponse = (result?: RateLimitResult): NextResponse =>
  NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: result
        ? {
            ...rateLimitHeaders(result),
            "Retry-After": String(Math.ceil((result.resetMs - Date.now()) / 1000)),
          }
        : undefined,
    },
  );
