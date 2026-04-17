import { NextResponse } from "next/server";
import { getForumPostBySlug, incrementForumViewCount } from "@/lib/forumService";
import { logger } from "@/lib/logger";
import { recordUserActivity } from "@/lib/userProfileService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getForumPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/forums/[slug] error");
    return NextResponse.json({ error: "Failed to fetch post." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // POST to the slug endpoint tracks a view (called client-side once per session)
  try {
    const { slug } = await params;
    const newCount = await incrementForumViewCount(decodeURIComponent(slug));
    if (newCount === null) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    void recordUserActivity({
      request,
      action: "forum_view",
      lastForumSlug: decodeURIComponent(slug),
    });
    return NextResponse.json({ view_count: newCount }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/forums/[slug] (view) error");
    return NextResponse.json({ error: "Failed to record view." }, { status: 500 });
  }
}
