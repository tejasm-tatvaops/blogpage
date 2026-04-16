import { NextResponse } from "next/server";
import { voteForumPost } from "@/lib/forumService";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { forumVoteLimiter, getRateLimitKey, rateLimitResponse, rateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notificationService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = forumVoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  // Read fingerprint — fall back to IP-derived key so un-fingerprinted clients can still vote
  const fingerprintId = getFingerprintFromRequest(request) ?? `ip:${ip}`;

  let body: { direction?: unknown } = {};
  try {
    body = (await request.json()) as { direction?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const direction = body.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: 'direction must be "up" or "down".' }, { status: 400 });
  }

  try {
    const { slug } = await params;
    const result = await voteForumPost(decodeURIComponent(slug), direction, fingerprintId);

    if (!result.ok) {
      if (result.reason === "already_voted") {
        return NextResponse.json({ error: "You have already voted on this post." }, { status: 409 });
      }
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    if (result.creator_fingerprint && result.creator_fingerprint !== fingerprintId) {
      await createNotification({
        type: "vote",
        post_id: result.id,
        recipient_key: `fp:${result.creator_fingerprint}`,
        message: `Your post received a ${direction === "up" ? "new upvote" : "new downvote"}.`,
      });
    }

    return NextResponse.json(
      { id: result.id, upvote_count: result.upvote_count, downvote_count: result.downvote_count, score: result.score },
      { status: 200, headers: rateLimitHeaders(rl) },
    );
  } catch (error) {
    logger.error({ error }, "POST /api/forums/[slug]/vote error");
    return NextResponse.json({ error: "Failed to register vote." }, { status: 500 });
  }
}
