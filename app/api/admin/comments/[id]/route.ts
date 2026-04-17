import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse } from "@/lib/adminApi";
import { deleteCommentById, getCommentMetaById } from "@/lib/commentService";
import { decrementForumCommentCount, getForumPostById } from "@/lib/forumService";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { id } = await params;
    const meta = await getCommentMetaById(id);
    const deleted = await deleteCommentById(id);
    if (!deleted) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (meta?.post_id) {
      const forumPost = await getForumPostById(meta.post_id);
      if (forumPost) {
        await decrementForumCommentCount(meta.post_id);
      }
    }
    logger.info({ id }, "Admin deleted comment");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/admin/comments/[id] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
