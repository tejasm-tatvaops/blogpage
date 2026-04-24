import { NextResponse } from "next/server";
import { getForumPostBySlug } from "@/lib/forumService";
import { deleteOwnCommentById, getCommentMetaById } from "@/lib/commentService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/requestIdentity";
import { logger } from "@/lib/logger";
import { revertAwardByEventKey } from "@/lib/reputationEngine";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  try {
    const { slug, commentId } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
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

    const sourceEventKey = `forum-comment:${actorKey}:${post.slug}:${commentId}`;
    void revertAwardByEventKey(actorKey, sourceEventKey).catch((error) => {
      logger.error({ error, actorKey, commentId, slug }, "Failed to reverse forum comment reputation");
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/forums/[slug]/comments/[commentId] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
