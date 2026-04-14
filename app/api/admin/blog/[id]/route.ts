import { NextResponse } from "next/server";
import { deletePost, getPostById, updatePost } from "@/lib/blogService";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse, parseBlogWriteInput, readJsonBody } from "@/lib/adminApi";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const { id } = await params;
    const post = await getPostById(id);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/admin/blog/[id] error");
    return NextResponse.json({ error: "Failed to fetch post." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const { id } = await params;
    const body = await readJsonBody<unknown>(request);
    const payload = parseBlogWriteInput(body);
    const post = await updatePost(id, payload);
    logger.info({ id, slug: post.slug }, "Admin updated blog post");
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "PATCH /api/admin/blog/[id] error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update post." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const { id } = await params;
    await deletePost(id);
    logger.info({ id }, "Admin soft-deleted blog post");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "DELETE /api/admin/blog/[id] error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete post." },
      { status: 400 },
    );
  }
}
