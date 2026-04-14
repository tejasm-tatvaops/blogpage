import { NextResponse } from "next/server";
import { incrementUpvote } from "@/lib/blogService";
import { upvoteLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  if (!upvoteLimiter(ip)) return rateLimitResponse();

  try {
    const { slug } = await params;
    const newCount = await incrementUpvote(decodeURIComponent(slug));
    return NextResponse.json({ upvote_count: newCount }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/upvote error");
    return NextResponse.json({ error: "Failed to register upvote." }, { status: 500 });
  }
}
