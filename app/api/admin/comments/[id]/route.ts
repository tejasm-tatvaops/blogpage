import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse } from "@/lib/adminApi";
import { deleteCommentById } from "@/lib/commentService";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");
  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const { id } = await params;
    const deleted = await deleteCommentById(id);
    if (!deleted) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    logger.info({ id }, "Admin deleted comment");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/admin/comments/[id] error");
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
