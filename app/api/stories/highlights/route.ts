import { NextResponse } from "next/server";
import {
  getHighlightsForUser,
  createHighlight,
  createHighlightSchema,
} from "@/lib/storyHighlightService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const highlights = await getHighlightsForUser(identityKey);
    return NextResponse.json({ highlights });
  } catch (error) {
    logger.error({ error }, "GET /api/stories/highlights error");
    return NextResponse.json({ error: "Failed to fetch highlights." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const result = createHighlightSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    const highlight = await createHighlight(identityKey, result.data);

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/stories/highlights error");
    return NextResponse.json({ error: "Failed to create highlight." }, { status: 500 });
  }
}
