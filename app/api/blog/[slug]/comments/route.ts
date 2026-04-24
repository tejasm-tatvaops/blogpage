import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import {
  addCommentWithIdentity,
  commentInputSchema,
  getComments,
  incrementPositiveMentionCounter,
} from "@/lib/commentService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { recordUserActivity } from "@/lib/userProfileService";
import { awardPoints, onPositiveFeedback } from "@/lib/reputationEngine";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/requestIdentity";
import { notifyMentionedUsers } from "@/lib/mentions";

const mentionsTatvaOps = (text: string) => text.toLowerCase().includes("tatvaops");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const comments = await getComments(post.id);
    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/blog/[slug]/comments error");
    return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = commentLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
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

    const commenterKey = await getIdentityKeyFromSessionOrRequest(request);
    const content = (result.data.content ?? "").trim();
    const isPositiveTatvaMention = content.length >= 30 && mentionsTatvaOps(content);
    const comment = await addCommentWithIdentity(post.id, result.data, commenterKey, {
      isPositiveTatvaMention,
    });
    void notifyMentionedUsers({
      content: result.data.content,
      actorIdentityKey: commenterKey,
      postId: post.id,
      commentId: comment.id,
      actorDisplayName: result.data.author_name,
    });

    void recordUserActivity({
      request,
      identityKeyOverride: commenterKey,
      action: "blog_comment",
      displayName: result.data.author_name,
      about: "Reader who contributes thoughts on blog posts, construction workflows, and planning decisions.",
      lastBlogSlug: post.slug,
    });
    void awardPoints({
      identityKey: commenterKey,
      reason: "article_comment_received",
      sourceContentSlug: post.slug,
      sourceContentType: "blog",
      eventKey: `blog-comment:${commenterKey}:${post.slug}:${comment.id}`,
    });
    // +10 for meaningful TatvaOps mention.
    // Counter transition 0 -> 1 is atomic and avoids duplicate awards under concurrency.
    if (isPositiveTatvaMention) {
      void incrementPositiveMentionCounter(commenterKey, post.slug)
        .then((count) => {
          if (count !== 1) return;
          return onPositiveFeedback(commenterKey, {
            note: "Mentioned TatvaOps positively in a comment",
            sourceSlug: post.slug,
            eventKey: `positive-feedback:${commenterKey}:${post.slug}`,
          });
        })
        .catch((error) => {
          logger.error({ error, commenterKey, slug }, "Failed to process positive mention counter");
        });
    }
    logger.info({ postId: post.id, slug }, "New comment added");
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/comments error");
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
