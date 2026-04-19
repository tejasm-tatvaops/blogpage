/**
 * GET /api/shorts/feed — Personalized shorts feed.
 *
 * Additive endpoint: does NOT replace /api/shorts. Falls back to hot-sort
 * when the user has no persona yet (cold start).
 *
 * Scoring (mirrors blog feed v2):
 *   score = interest_match×0.45 + recency×0.25 + engagement×0.20 + diversity×0.10
 *
 * Feature-flag gated by personasEnabled system toggle.
 */

import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { getPersonaVector, computeInterestMatch, normaliseTag } from "@/lib/personaService";
import { getSystemToggles } from "@/lib/systemToggles";
import { connectToDatabase } from "@/lib/mongodb";
import { VideoPostModel } from "@/models/VideoPost";
import { logger } from "@/lib/logger";

const MAX_SHORTS_PER_FEED = 40;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));

    // Identify user
    const fp = getFingerprintFromRequest(request);
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const identityKey = fp ? `fp:${fp}` : `ip:${ip}`;

    const { personasEnabled } = getSystemToggles();

    await connectToDatabase();

    // Fetch candidate pool (hot, published, not deleted)
    const candidates = await VideoPostModel.find({
      published: true,
      deletedAt: null,
    })
      .sort({ hotScore: -1, createdAt: -1 })
      .limit(MAX_SHORTS_PER_FEED)
      .lean();

    if (!personasEnabled || candidates.length === 0) {
      // Cold-start / persona disabled: return hot-sorted slice
      const start = (page - 1) * limit;
      return NextResponse.json(
        { shorts: candidates.slice(start, start + limit), personalized: false },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
      );
    }

    // Load persona vector
    const personaVector = await getPersonaVector(identityKey, 30, true);

    if (personaVector.length === 0) {
      const start = (page - 1) * limit;
      return NextResponse.json(
        { shorts: candidates.slice(start, start + limit), personalized: false },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    // Score each short
    const seenTags = new Set<string>();
    const scored = candidates.map((short) => {
      const tags: string[] = (short.tags as string[] | undefined) ?? [];
      const category = (short.category as string | undefined) ?? "";

      const interestMatch = computeInterestMatch(tags, category, personaVector);

      const createdAt = (short.createdAt as Date | undefined) ?? new Date(0);
      const hoursAgo = Math.max(0, (Date.now() - createdAt.getTime()) / 3_600_000);
      const recencyScore = Math.exp(-0.04 * hoursAgo); // slightly slower decay for video

      const views   = (short.views as number | undefined) ?? 0;
      const likes   = (short.likes as number | undefined) ?? 0;
      const engagementScore = (likes * 4) / (views + 10);

      // Diversity: penalise tags already heavily seen this page
      const normTags = tags.map(normaliseTag);
      const novelTags = normTags.filter((t) => !seenTags.has(t));
      const diversityBoost = novelTags.length > 0 ? 0.1 : -0.05;
      normTags.forEach((t) => seenTags.add(t));

      const score =
        interestMatch   * 0.45 +
        recencyScore    * 0.25 +
        Math.min(1, engagementScore) * 0.20 +
        diversityBoost  * 0.10;

      return { short, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const start = (page - 1) * limit;
    const page_results = scored.slice(start, start + limit).map((s) => s.short);

    return NextResponse.json(
      { shorts: page_results, personalized: true },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (error) {
    logger.error({ error }, "GET /api/shorts/feed error");
    return NextResponse.json({ error: "Failed to fetch personalized shorts." }, { status: 500 });
  }
}
