import { NextResponse } from "next/server";
import { incrementDownvote } from "@/lib/blogService";
import { downvoteLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = downvoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const newCount = await incrementDownvote(decodeURIComponent(slug));
    return NextResponse.json({ downvote_count: newCount }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/downvote error");
    return NextResponse.json({ error: "Failed to register downvote." }, { status: 500 });
  }
}
