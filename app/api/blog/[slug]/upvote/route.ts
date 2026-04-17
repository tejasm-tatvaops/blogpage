import { NextResponse } from "next/server";
import { incrementUpvote, getPostBySlug } from "@/lib/blogService";
import {
  upvoteLimiter,
  likeAntiGamingLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { BlogLikeModel } from "@/models/BlogLike";
import { connectToDatabase } from "@/lib/mongodb";
import { recordInterest } from "@/lib/personaService";
import { invalidateFeedCache } from "@/lib/feedCache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // ── Rate limit: standard per-IP ──────────────────────────────────────────
  const ip = getRateLimitKey(request);
  const rl = upvoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    // ── Build identity key ───────────────────────────────────────────────────
    const fingerprintId = getFingerprintFromRequest(request);
    const ipAddress =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const identityKey = fingerprintId
      ? `fp:${fingerprintId}`
      : `ip:${ipAddress ?? "anonymous"}`;

    // ── Anti-gaming: max 20 likes/min per identity ───────────────────────────
    const antiGaming = likeAntiGamingLimiter(identityKey);
    if (!antiGaming.allowed) {
      return NextResponse.json(
        { error: "Too many likes in a short period. Slow down." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    await connectToDatabase();

    // ── Dedup: one upvote per identity per blog ──────────────────────────────
    try {
      await BlogLikeModel.create({
        blog_slug: decodedSlug,
        identity_key: identityKey,
        direction: "up",
      });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "Already voted." }, { status: 409 });
      }
      throw err;
    }

    const newCount = await incrementUpvote(decodedSlug);

    // ── Invalidate cached feed so next fetch re-ranks with updated taste ──────
    void invalidateFeedCache(identityKey);

    // ── Update persona with post signals (fire-and-forget) ───────────────────
    void (async () => {
      const post = await getPostBySlug(decodedSlug);
      if (post) {
        void recordInterest({
          identityKey,
          tags: post.tags,
          category: post.category,
          action: "like",
        });
      }
    })();

    return NextResponse.json(
      { upvote_count: newCount },
      {
        status: 200,
        headers: { "X-RateLimit-Remaining": String(rl.remaining) },
      },
    );
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/upvote error");
    return NextResponse.json({ error: "Failed to register upvote." }, { status: 500 });
  }
}
