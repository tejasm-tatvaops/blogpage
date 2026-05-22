import { NextResponse } from "next/server";
import {
  deleteHighlight,
  addStoryToHighlight,
  removeStoryFromHighlight,
  getHighlightStories,
} from "@/lib/storyHighlightService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const stories = await getHighlightStories(id);
    return NextResponse.json({ stories });
  } catch (error) {
    logger.error({ error }, "GET /api/stories/highlights/[id] error");
    return NextResponse.json({ error: "Failed to fetch highlight stories." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);

    let body: { action?: string; story_id?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const storyId = body.story_id?.trim();
    if (!storyId) {
      return NextResponse.json({ error: "story_id required." }, { status: 400 });
    }

    if (body.action === "remove") {
      const ok = await removeStoryFromHighlight(id, storyId, identityKey);
      return NextResponse.json({ success: ok });
    }

    const ok = await addStoryToHighlight(id, storyId, identityKey);
    return NextResponse.json({ success: ok });
  } catch (error) {
    logger.error({ error }, "PATCH /api/stories/highlights/[id] error");
    return NextResponse.json({ error: "Failed to update highlight." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const ok = await deleteHighlight(id, identityKey);
    if (!ok) return NextResponse.json({ error: "Highlight not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "DELETE /api/stories/highlights/[id] error");
    return NextResponse.json({ error: "Failed to delete highlight." }, { status: 500 });
  }
}
