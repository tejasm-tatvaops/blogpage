import { NextResponse } from "next/server";
import { reactToStory } from "@/lib/storyService";
import { notifyStoryReaction } from "@/lib/storyNotifications";
import { STORY_REACTION_TYPES, type StoryReactionType } from "@/models/StoryReaction";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { createRateLimiter, getRateLimitKey } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const reactionLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const ip = getRateLimitKey(request);
  const rl = reactionLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many reactions." }, { status: 429 });
  }

  try {
    const { id } = await params;

    let reactionType: StoryReactionType;
    try {
      const body = (await request.json()) as { reaction_type?: string };
      if (!body.reaction_type || !STORY_REACTION_TYPES.includes(body.reaction_type as StoryReactionType)) {
        return NextResponse.json({ error: "Invalid reaction type." }, { status: 400 });
      }
      reactionType = body.reaction_type as StoryReactionType;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const result = await reactToStory(id, identityKey, reactionType);

    // Fire-and-forget notification on new reactions only
    if (result.added) {
      void notifyStoryReaction(id, identityKey, reactionType);
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, "POST /api/stories/[id]/react error");
    return NextResponse.json({ error: "Failed to react." }, { status: 500 });
  }
}
