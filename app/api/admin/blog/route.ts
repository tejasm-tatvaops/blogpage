import { NextResponse } from "next/server";
import { createPost, getAllPosts } from "@/lib/blogService";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { errorResponse, parseBlogWriteInput, readJsonBody } from "@/lib/adminApi";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

    const posts = await getAllPosts({ includeDrafts: true, limit, page });
    return NextResponse.json({ posts, page, limit }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/admin/blog error");
    return NextResponse.json(
      { error: "Failed to fetch posts." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");

  if (!adminApiLimiter(getRateLimitKey(request))) return rateLimitResponse();

  try {
    const body = await readJsonBody<unknown>(request);
    const payload = parseBlogWriteInput(body);
    const post = await createPost(payload);
    logger.info({ slug: post.slug }, "Admin created blog post");
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/admin/blog error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create post." },
      { status: 400 },
    );
  }
}
