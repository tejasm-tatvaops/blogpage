import { NextResponse } from "next/server";
import { deleteForumPost } from "@/lib/forumService";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = adminApiLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  const isAdmin = await requireAdminApiAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteForumPost(id);
    if (!deleted) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    logger.info({ id }, "Forum post deleted by admin");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/admin/forums/[id] error");
    return NextResponse.json({ error: "Failed to delete forum post." }, { status: 500 });
  }
}
