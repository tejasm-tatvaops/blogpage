import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse } from "@/lib/adminApi";
import { getCommentsForAdmin } from "@/lib/commentService";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
    const comments = await getCommentsForAdmin({ page, limit });
    return NextResponse.json({ comments, page, limit }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/admin/comments error");
    return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  }
}
