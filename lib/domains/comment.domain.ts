import mongoose from "mongoose";
import {
  addCommentWithIdentity,
  decrementPositiveMentionCounter,
  deleteOwnCommentById,
  getCommentMetaById,
  incrementPositiveMentionCounter,
  seedPositiveMentionCounterFromComments,
  type CommentInput,
} from "@/lib/services/comment.service";
import { incrementForumCommentCount } from "@/lib/forumService";
import { logger } from "@/lib/logger";
import {
  awardPoints,
  onForumAnswerGiven,
  onPositiveFeedback,
  revertAwardByEventKey,
} from "@/lib/services/reputation.service";
import { hasMinimumContentLength } from "@/lib/utils/validation";
import type { CommentWorkflowOutcome } from "@/lib/types/comment.types";
import { getSystemToggles } from "@/lib/systemToggles";

const mentionsTatvaOps = (text: string) => text.toLowerCase().includes("tatvaops");

export async function createCommentWithRewards(args: {
  postId: string;
  postSlug: string;
  postType: "blog" | "forum";
  identityKey: string;
  input: CommentInput;
}) {
  if (args.postType === "forum") {
    const comment = await addCommentWithIdentity(args.postId, args.input, args.identityKey);
    await incrementForumCommentCount(args.postId);
    if (getSystemToggles().reputationEnabled) {
      void onForumAnswerGiven(args.identityKey, args.postSlug, `forum-comment:${args.identityKey}:${args.postSlug}:${comment.id}`);
    }
    return comment;
  }

  const flowContext = { flow: "comment_create_blog", identityKey: args.identityKey, slug: args.postSlug };
  const content = (args.input.content ?? "").trim();
  const isPositiveTatvaMention = hasMinimumContentLength(content, 30) && mentionsTatvaOps(content);
  logger.info({ ...flowContext, step: "transaction_start", isPositiveTatvaMention }, "Comment create flow started");

  const session = await mongoose.startSession();
  try {
    const comment = await session.withTransaction(async () => {
      const createdComment = await addCommentWithIdentity(args.postId, args.input, args.identityKey, {
        isPositiveTatvaMention,
        session,
      });
      await awardPoints({
        identityKey: args.identityKey,
        reason: "article_comment_received",
        sourceContentSlug: args.postSlug,
        sourceContentType: "blog",
        eventKey: `blog-comment:${args.identityKey}:${args.postSlug}:${createdComment.id}`,
      }, { session });

      if (isPositiveTatvaMention) {
        const count = await incrementPositiveMentionCounter(args.identityKey, args.postSlug, { session });
        if (count === 1) {
          await onPositiveFeedback(args.identityKey, {
            note: "Mentioned TatvaOps positively in a comment",
            sourceSlug: args.postSlug,
            eventKey: `positive-feedback:${args.identityKey}:${args.postSlug}`,
          }, { session });
        }
      }
      return createdComment;
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
    logger.info({ ...flowContext, step: "transaction_commit", commentId: comment.id }, "Comment create flow committed");
    return comment;
  } finally {
    await session.endSession();
  }
}

export async function deleteCommentWithReversal(args: {
  postId: string;
  postSlug: string;
  postType: "blog" | "forum";
  identityKey: string;
  commentId: string;
}): Promise<CommentWorkflowOutcome> {
  const flow = args.postType === "blog" ? "comment_delete_blog" : "comment_delete_forum";
  const flowContext = { flow, identityKey: args.identityKey, slug: args.postSlug, commentId: args.commentId };
  logger.info({ ...flowContext, step: "transaction_start" }, "Delete flow started");

  const session = await mongoose.startSession();
  try {
    return (await session.withTransaction(async () => {
      const meta = await getCommentMetaById(args.commentId, { session });
      if (!meta || meta.post_id !== args.postId) {
        return "not_found" as const;
      }

      const result = await deleteOwnCommentById(args.commentId, args.identityKey, { session });
      if (result.status === "forbidden") return "forbidden" as const;
      if (result.status === "not_found") return "not_found" as const;
      if (result.status !== "deleted") return "failed" as const;

      const sourceEventKey = `${args.postType}-comment:${args.identityKey}:${args.postSlug}:${args.commentId}`;
      await revertAwardByEventKey(args.identityKey, sourceEventKey, { session });
      logger.info({ ...flowContext, eventKey: sourceEventKey, step: "base_reversal_complete" }, "Base reversal complete");

      if (args.postType === "blog" && result.deleted.is_positive_tatva_mention) {
        const remainingCount = await decrementPositiveMentionCounter(args.identityKey, args.postSlug, { session });
        if (remainingCount === 0) {
          await revertAwardByEventKey(args.identityKey, `positive-feedback:${args.identityKey}:${args.postSlug}`, { session });
          logger.info(
            { ...flowContext, eventKey: `positive-feedback:${args.identityKey}:${args.postSlug}`, step: "bonus_reversal_complete" },
            "Positive feedback reversal complete",
          );
        } else if (remainingCount < 0) {
          const seeded = await seedPositiveMentionCounterFromComments(args.identityKey, args.postId, args.postSlug, { session });
          if (seeded === 0) {
            await revertAwardByEventKey(args.identityKey, `positive-feedback:${args.identityKey}:${args.postSlug}`, { session });
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
}

