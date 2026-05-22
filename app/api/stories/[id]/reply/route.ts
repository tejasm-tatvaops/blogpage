import { NextResponse } from "next/server";
import { incrementStoryReplyCount, getStoryById } from "@/lib/storyService";
import { notifyStoryReply } from "@/lib/storyNotifications";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { createRateLimiter, getRateLimitKey } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const replyLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const ip = getRateLimitKey(request);
  const rl = replyLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many replies." }, { status: 429 });
  }

  try {
    const { id } = await params;

    let text = "";
    try {
      const body = (await request.json()) as { text?: string };
      text = String(body.text ?? "").trim().slice(0, 500);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
    }

    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const story = await getStoryById(id);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    await incrementStoryReplyCount(id);
    void notifyStoryReply(id, identityKey, text);

    logger.info({ storyId: id, identityKey }, "Story reply recorded");
    return NextResponse.json({ success: true, story_id: id });
  } catch (error) {
    logger.error({ error }, "POST /api/stories/[id]/reply error");
    return NextResponse.json({ error: "Failed to post reply." }, { status: 500 });
  }
}
