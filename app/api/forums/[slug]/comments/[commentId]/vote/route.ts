import { NextResponse } from "next/server";
import { getForumPostBySlug } from "@/lib/forumService";
import { voteComment } from "@/lib/services/comment.service";
import { forumVoteLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = forumVoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug, commentId } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const actorKey = await getIdentityKeyFromSessionOrRequest(request);

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

    const result = await voteComment(post.id, decodeURIComponent(commentId), direction, actorKey);
    if (!result) return NextResponse.json({ error: "Comment not found." }, { status: 404 });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/forums/[slug]/comments/[commentId]/vote error");
    return NextResponse.json({ error: "Failed to register vote." }, { status: 500 });
  }
}
