import { NextResponse } from "next/server";
import { incrementDownvote } from "@/lib/blogService";
import { downvoteLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { BlogLikeModel } from "@/models/BlogLike";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = downvoteLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);

    const identityKey = await getIdentityKeyFromSessionOrRequest(request);

    await connectToDatabase();

    try {
      await BlogLikeModel.create({ blog_slug: decodedSlug, identity_key: identityKey, direction: "down" });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: "Already voted." }, { status: 409 });
      }
      throw err;
    }

    const newCount = await incrementDownvote(decodedSlug);
    return NextResponse.json({ downvote_count: newCount }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/downvote error");
    return NextResponse.json({ error: "Failed to register downvote." }, { status: 500 });
  }
}
