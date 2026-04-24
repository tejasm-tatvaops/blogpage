import { NextResponse } from "next/server";
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  try {
    const { slug, commentId } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const meta = await getCommentMetaById(commentId);
    if (!meta || meta.post_id !== post.id) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    const actorKey = await getIdentityKeyFromSessionOrRequest(request);
    const result = await deleteOwnCommentById(commentId, actorKey);
    if (result.status === "forbidden") {
      return NextResponse.json({ error: "You can only delete your own comment." }, { status: 403 });
    }
    if (result.status === "not_found") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (result.status !== "deleted") {
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
    }

    const sourceEventKey = `blog-comment:${actorKey}:${post.slug}:${commentId}`;
    void revertAwardByEventKey(actorKey, sourceEventKey).catch((error) => {
      logger.error({ error, actorKey, commentId, slug }, "Failed to reverse blog comment reputation");
    });

    if (result.deleted.is_positive_tatva_mention) {
      void decrementPositiveMentionCounter(actorKey, post.slug)
        .then(async (remainingCount) => {
          if (remainingCount > 0) return;
          if (remainingCount === 0) {
            return revertAwardByEventKey(actorKey, `positive-feedback:${actorKey}:${post.slug}`);
          }
          // Counter missing unexpectedly: rebuild once from source comments, then decide.
          const seeded = await seedPositiveMentionCounterFromComments(actorKey, post.id, post.slug);
          if (seeded === 0) {
            return revertAwardByEventKey(actorKey, `positive-feedback:${actorKey}:${post.slug}`);
          }
        })
        .catch((error) => {
          logger.error(
            { error, actorKey, commentId, slug },
            "Failed to process positive feedback reversal on delete",
          );
        });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/blog/[slug]/comments/[commentId] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
