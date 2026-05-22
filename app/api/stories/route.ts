import { NextResponse } from "next/server";
import { getStoryFeed } from "@/lib/storyFeed";
import { createStory, createStoryInputSchema } from "@/lib/storyService";
import { createRateLimiter, getRateLimitKey, rateLimitHeaders } from "@/lib/rateLimit";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

const storyPostLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 }); // 10/hour

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "30")));

    const result = await getStoryFeed(identityKey, limit);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    logger.error({ error }, "GET /api/stories error");
    return NextResponse.json({ error: "Failed to fetch stories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = storyPostLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many story posts. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = createStoryInputSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid input.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const story = await createStory(identityKey, result.data);

    logger.info({ id: story.id }, "Story created via API");
    return NextResponse.json({ story }, { status: 201, headers: rateLimitHeaders(rl) });
  } catch (error) {
    logger.error({ error }, "POST /api/stories error");
    return NextResponse.json({ error: "Failed to create story." }, { status: 500 });
  }
}
