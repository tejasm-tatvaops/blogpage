import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/adminApi";
import { logger } from "@/lib/logger";
import { updateVideoPost, deleteVideoPost, getVideoPostById } from "@/lib/videoService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  try {
    const { id } = await params;
    const post = await getVideoPostById(id);
    if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    logger.error({ error }, "GET /api/admin/videos/[id] error");
    return NextResponse.json({ error: "Failed to fetch video." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  try {
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const post = await updateVideoPost(id, body as Parameters<typeof updateVideoPost>[1]);
    if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
    logger.info({ id }, "Admin updated video post");
    return NextResponse.json({ post });
  } catch (error) {
    logger.error({ error }, "PATCH /api/admin/videos/[id] error");
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to update video.",
    }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  try {
    const { id } = await params;
    const ok = await deleteVideoPost(id);
    if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
    logger.info({ id }, "Admin deleted video post");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "DELETE /api/admin/videos/[id] error");
    return NextResponse.json({ error: "Failed to delete video." }, { status: 500 });
  }
}
