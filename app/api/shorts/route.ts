import { NextResponse } from "next/server";
import { getVideoPosts, type VideoFeedSort } from "@/lib/videoService";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get("sort") ?? "hot") as VideoFeedSort;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const tag = searchParams.get("tag") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const validSorts: VideoFeedSort[] = ["hot", "new", "trending", "top"];
    const safeSort = validSorts.includes(sort) ? sort : "hot";

    const result = await getVideoPosts({ sort: safeSort, page, limit, tag, category });
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error({ error }, "GET /api/shorts error");
    return NextResponse.json({ error: "Failed to fetch shorts." }, { status: 500 });
  }
}
