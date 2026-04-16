import { NextResponse } from "next/server";
import {
  getForumPosts,
  createForumPost,
  forumPostInputSchema,
  type ForumFeedSort,
} from "@/lib/forumService";
import { forumPostLimiter, getRateLimitKey, rateLimitResponse, rateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") ?? "hot") as ForumFeedSort;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const tag = searchParams.get("tag") ?? undefined;
    const query = searchParams.get("q") ?? undefined;

    const validSorts: ForumFeedSort[] = ["hot", "new", "top", "discussed"];
    const safeSort = validSorts.includes(sort) ? sort : "hot";

    const result = await getForumPosts({ sort: safeSort, page, limit, tag, query });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error({ error }, "GET /api/forums error");
    return NextResponse.json({ error: "Failed to fetch forum posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = forumPostLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = forumPostInputSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid input.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const post = await createForumPost(result.data);
    logger.info({ slug: post.slug }, "Forum post created via API");
    return NextResponse.json(
      { post },
      { status: 201, headers: rateLimitHeaders(rl) },
    );
  } catch (error) {
    logger.error({ error }, "POST /api/forums error");
    return NextResponse.json({ error: "Failed to create forum post." }, { status: 500 });
  }
}
