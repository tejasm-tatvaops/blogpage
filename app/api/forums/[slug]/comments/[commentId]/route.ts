import { NextResponse } from "next/server";
import { getForumPostBySlug } from "@/lib/forumService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";
import { enqueueRecoveryTask } from "@/lib/recoveryQueue";
import { deleteCommentWithReversal } from "@/lib/domains/comment.domain";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  try {
    const { slug, commentId } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const actorKey = await getIdentityKeyFromSessionOrRequest(request);
    const outcome = await deleteCommentWithReversal({
      postId: post.id,
      postSlug: post.slug,
      postType: "forum",
      identityKey: actorKey,
      commentId,
    });

    if (outcome === "forbidden") {
      return NextResponse.json({ error: "You can only delete your own comment." }, { status: 403 });
    }
    if (outcome === "not_found") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (outcome !== "ok") {
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
    }
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
            await deleteCommentWithReversal({
              postId: post.id,
              postSlug: post.slug,
              postType: "forum",
              identityKey: actorKey,
              commentId,
            });
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
