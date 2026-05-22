import { NextResponse } from "next/server";
import { getStoryById, deleteStory } from "@/lib/storyService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const story = await getStoryById(id, identityKey);

    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    return NextResponse.json({ story });
  } catch (error) {
    logger.error({ error }, "GET /api/stories/[id] error");
    return NextResponse.json({ error: "Failed to fetch story." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const deleted = await deleteStory(id, identityKey);

    if (!deleted) {
      return NextResponse.json(
        { error: "Story not found or you do not own it." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "DELETE /api/stories/[id] error");
    return NextResponse.json({ error: "Failed to delete story." }, { status: 500 });
  }
}
