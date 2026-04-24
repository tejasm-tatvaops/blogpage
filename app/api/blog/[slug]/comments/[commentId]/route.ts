import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getPostBySlug } from "@/lib/blogService";
import {
  decrementPositiveMentionCounter,
  deleteOwnCommentById,
  getCommentMetaById,
  seedPositiveMentionCounterFromComments,
} from "@/lib/commentService";
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
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const actorKey = await getIdentityKeyFromSessionOrRequest(request);
    const flowContext = { flow: "comment_delete_blog", identityKey: actorKey, slug: post.slug, commentId };
    logger.info({ ...flowContext, step: "transaction_start" }, "Delete flow started");
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
        if (result.status !== "deleted") {
          return "failed" as const;
        }

        const sourceEventKey = `blog-comment:${actorKey}:${post.slug}:${commentId}`;
        await revertAwardByEventKey(actorKey, sourceEventKey, { session });
        logger.info({ ...flowContext, eventKey: sourceEventKey, step: "base_reversal_complete" }, "Base reversal complete");

        if (result.deleted.is_positive_tatva_mention) {
          const remainingCount = await decrementPositiveMentionCounter(actorKey, post.slug, { session });
          if (remainingCount === 0) {
            await revertAwardByEventKey(actorKey, `positive-feedback:${actorKey}:${post.slug}`, { session });
            logger.info(
              { ...flowContext, eventKey: `positive-feedback:${actorKey}:${post.slug}`, step: "bonus_reversal_complete" },
              "Positive feedback reversal complete",
            );
          } else if (remainingCount < 0) {
            // Counter missing unexpectedly: rebuild once from source comments, then decide.
            const seeded = await seedPositiveMentionCounterFromComments(actorKey, post.id, post.slug, { session });
            if (seeded === 0) {
              await revertAwardByEventKey(actorKey, `positive-feedback:${actorKey}:${post.slug}`, { session });
            }
          }
        }

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
    logger.info({ ...flowContext, step: "transaction_commit" }, "Delete flow committed");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    try {
      const { slug, commentId } = await params;
      const post = await getPostBySlug(decodeURIComponent(slug));
      if (post) {
        const actorKey = await getIdentityKeyFromSessionOrRequest(request);
        const taskId = `recover:blog-delete:${actorKey}:${post.slug}:${commentId}`;
        enqueueRecoveryTask({
          id: taskId,
          flow: "comment_delete_blog",
          run: async () => {
            const session = await mongoose.startSession();
            try {
              await session.withTransaction(async () => {
                const result = await deleteOwnCommentById(commentId, actorKey, { session });
                if (result.status !== "deleted") return;
                const sourceEventKey = `blog-comment:${actorKey}:${post.slug}:${commentId}`;
                await revertAwardByEventKey(actorKey, sourceEventKey, { session });
                if (result.deleted.is_positive_tatva_mention) {
                  const remainingCount = await decrementPositiveMentionCounter(actorKey, post.slug, { session });
                  if (remainingCount === 0) {
                    await revertAwardByEventKey(actorKey, `positive-feedback:${actorKey}:${post.slug}`, { session });
                  }
                }
              });
            } finally {
              await session.endSession();
            }
          },
        });
      }
    } catch (enqueueError) {
      logger.error({ error: enqueueError }, "Failed to enqueue delete recovery task");
    }
    logger.error({ error }, "DELETE /api/blog/[slug]/comments/[commentId] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
