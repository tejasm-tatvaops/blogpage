import { NextResponse } from "next/server";
import { recordStoryView } from "@/lib/storyService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);

    let dwellTimeMs = 0;
    let completed = false;
    try {
      const body = (await request.json()) as { dwell_time_ms?: number; completed?: boolean };
      dwellTimeMs = Math.max(0, Number(body.dwell_time_ms ?? 0));
      completed = Boolean(body.completed);
    } catch {
      // Default values are fine
    }

    await recordStoryView(id, identityKey, dwellTimeMs, completed);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "POST /api/stories/[id]/view error");
    return NextResponse.json({ error: "Failed to record view." }, { status: 500 });
  }
}
