import { NextResponse } from "next/server";
import { getForumPostBySlug, incrementForumCommentCount } from "@/lib/forumService";
import { addCommentWithIdentity, commentInputSchema, getComments } from "@/lib/commentService";
import { forumCommentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { recordUserActivity } from "@/lib/userProfileService";
import { onForumAnswerGiven } from "@/lib/reputationEngine";
import { getIdentityKeyFromRequest } from "@/lib/fingerprint";
import { getSystemToggles } from "@/lib/systemToggles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const comments = await getComments(post.id);
    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/forums/[slug]/comments error");
    return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = forumCommentLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = commentInputSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid input.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const actorKey = getIdentityKeyFromRequest(request);
    const comment = await addCommentWithIdentity(post.id, result.data, actorKey);
    // Keep comment_count denormalized for fast feed queries
    await incrementForumCommentCount(post.id);

    if (getSystemToggles().reputationEnabled) {
      void onForumAnswerGiven(actorKey, post.slug, `forum-comment:${actorKey}:${post.slug}:${comment.id}`);
    }

    void recordUserActivity({
      request,
      action: "forum_comment",
      displayName: result.data.author_name,
      about: "Community member actively commenting on construction questions, tradeoffs, and project planning topics.",
      lastForumSlug: post.slug,
    });

    logger.info({ postId: post.id, slug }, "Forum comment added");
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/forums/[slug]/comments error");
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
