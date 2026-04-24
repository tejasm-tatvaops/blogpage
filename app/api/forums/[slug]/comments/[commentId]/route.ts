import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getForumPostBySlug } from "@/lib/forumService";
import { deleteOwnCommentById, getCommentMetaById } from "@/lib/commentService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/requestIdentity";
import { logger } from "@/lib/logger";
import { revertAwardByEventKey } from "@/lib/reputationEngine";
import { enqueueRecoveryTask } from "@/lib/recoveryQueue";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  try {
    const { slug, commentId } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const actorKey = await getIdentityKeyFromSessionOrRequest(request);
    const flowContext = { flow: "comment_delete_forum", identityKey: actorKey, slug: post.slug, commentId };
    logger.info({ ...flowContext, step: "transaction_start" }, "Forum delete flow started");
    const session = await mongoose.startSession();
    let outcome: "ok" | "not_found" | "forbidden" | "failed" = "failed";
    try {
      outcome = (await session.withTransaction(async () => {
        const meta = await getCommentMetaById(commentId, { session });
        if (!meta || meta.post_id !== post.id) {
          return "not_found" as const;
        }

        const result = await deleteOwnCommentById(commentId, actorKey, { session });
        if (result.status === "forbidden") {
          return "forbidden" as const;
        }
        if (result.status === "not_found") {
          return "not_found" as const;
        }

        const sourceEventKey = `forum-comment:${actorKey}:${post.slug}:${commentId}`;
        await revertAwardByEventKey(actorKey, sourceEventKey, { session });
        logger.info({ ...flowContext, eventKey: sourceEventKey, step: "reversal_complete" }, "Forum reversal complete");
        return "ok" as const;
      }, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      })) ?? "failed";
    } finally {
      await session.endSession();
    }

    if (outcome === "forbidden") {
      return NextResponse.json({ error: "You can only delete your own comment." }, { status: 403 });
    }
    if (outcome === "not_found") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (outcome !== "ok") {
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
    }
    logger.info({ ...flowContext, step: "transaction_commit" }, "Forum delete flow committed");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    try {
      const { slug, commentId } = await params;
      const post = await getForumPostBySlug(decodeURIComponent(slug));
      if (post) {
        const actorKey = await getIdentityKeyFromSessionOrRequest(request);
        enqueueRecoveryTask({
          id: `recover:forum-delete:${actorKey}:${post.slug}:${commentId}`,
          flow: "comment_delete_forum",
          run: async () => {
            const session = await mongoose.startSession();
            try {
              await session.withTransaction(async () => {
                const result = await deleteOwnCommentById(commentId, actorKey, { session });
                if (result.status !== "deleted") return;
                await revertAwardByEventKey(actorKey, `forum-comment:${actorKey}:${post.slug}:${commentId}`, { session });
              });
            } finally {
              await session.endSession();
            }
          },
        });
      }
    } catch (enqueueError) {
      logger.error({ error: enqueueError }, "Failed to enqueue forum delete recovery task");
    }
    logger.error({ error }, "DELETE /api/forums/[slug]/comments/[commentId] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
