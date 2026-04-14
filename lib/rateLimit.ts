import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";

type RateLimiterOptions = {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
};

type Limiter = (key: string) => boolean;

export const createRateLimiter = ({ limit, windowMs }: RateLimiterOptions): Limiter => {
  const cache = new LRUCache<string, number[]>({ max: 10_000 });

  return (key: string): boolean => {
    const now = Date.now();
    const timestamps = cache.get(key) ?? [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);
    cache.set(key, recent);
    return recent.length <= limit;
  };
};

/** Per-route limiters — shared across requests via module-level singletons. */
export const generateBlogLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const bulkGenerateLimiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
export const adminApiLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const commentLimiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
export const upvoteLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

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

export const rateLimitResponse = (): NextResponse =>
  NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
