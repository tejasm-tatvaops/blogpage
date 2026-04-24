import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import { voteComment } from "@/lib/services/comment.service";
import { getRateLimitKey, rateLimitResponse, upvoteLimiter } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

type VotePayload = {
  direction?: "up" | "down";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = upvoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug, commentId } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    let body: VotePayload;
    try {
      body = (await request.json()) as VotePayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const direction = body.direction;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "Invalid vote direction." }, { status: 400 });
    }

    const updated = await voteComment(post.id, commentId, direction);
    if (!updated) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/comments/[commentId]/vote error");
    return NextResponse.json({ error: "Failed to update vote." }, { status: 500 });
  }
}
