import { NextResponse } from "next/server";
import { getVideoPostBySlug } from "@/lib/videoService";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getVideoPostBySlug(slug);
    if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    logger.error({ error }, "GET /api/shorts/[slug] error");
    return NextResponse.json({ error: "Failed to fetch short." }, { status: 500 });
  }
}
