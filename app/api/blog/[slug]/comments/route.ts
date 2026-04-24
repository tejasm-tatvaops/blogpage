import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
    const flowContext = { flow: "comment_create_blog", identityKey: commenterKey, slug: post.slug };
    const content = (result.data.content ?? "").trim();
    const isPositiveTatvaMention = content.length >= 30 && mentionsTatvaOps(content);
    logger.info({ ...flowContext, step: "transaction_start", isPositiveTatvaMention }, "Comment create flow started");
    const session = await mongoose.startSession();
    let comment: Awaited<ReturnType<typeof addCommentWithIdentity>> | null = null;
    try {
      comment = await session.withTransaction(async () => {
        const createdComment = await addCommentWithIdentity(post.id, result.data, commenterKey, {
          isPositiveTatvaMention,
          session,
        });
        await awardPoints({
          identityKey: commenterKey,
          reason: "article_comment_received",
          sourceContentSlug: post.slug,
          sourceContentType: "blog",
          eventKey: `blog-comment:${commenterKey}:${post.slug}:${createdComment.id}`,
        }, { session });
        logger.info(
          { ...flowContext, eventKey: `blog-comment:${commenterKey}:${post.slug}:${createdComment.id}`, step: "base_award_complete" },
          "Base comment award complete",
        );

        if (isPositiveTatvaMention) {
          const count = await incrementPositiveMentionCounter(commenterKey, post.slug, { session });
          if (count === 1) {
            await onPositiveFeedback(commenterKey, {
              note: "Mentioned TatvaOps positively in a comment",
              sourceSlug: post.slug,
              eventKey: `positive-feedback:${commenterKey}:${post.slug}`,
            }, { session });
            logger.info(
              { ...flowContext, eventKey: `positive-feedback:${commenterKey}:${post.slug}`, step: "bonus_award_complete" },
              "Positive feedback award complete",
            );
          }
        }
        return createdComment;
      }, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });
    } finally {
      await session.endSession();
    }

    if (!comment) {
      return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
    }
    logger.info({ ...flowContext, step: "transaction_commit", commentId: comment.id }, "Comment create flow committed");
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
    logger.info({ postId: post.id, slug }, "New comment added");
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/comments error");
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
