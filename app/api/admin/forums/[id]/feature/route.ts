import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { setForumPostFeatured } from "@/lib/forumService";
import { logger } from "@/lib/logger";

const payloadSchema = z.object({
  is_featured: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as unknown;
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { id } = await params;
    const updated = await setForumPostFeatured(id, parsed.data.is_featured);
    if (!updated) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json({ post: updated }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "PATCH /api/admin/forums/[id]/feature error");
    return NextResponse.json({ error: "Failed to update featured status." }, { status: 500 });
  }
}
