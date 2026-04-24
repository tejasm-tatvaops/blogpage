/**
 * GET /api/forums/feed — Personalized forum feed.
 *
 * Additive endpoint: does NOT replace /api/forums. Falls back to hot-sort
 * when the user has no persona yet (cold start).
 *
 * Scoring:
 *   score = interest_match×0.40 + hot_score×0.30 + recency×0.20 + diversity×0.10
 *
 * Feature-flag gated by personasEnabled system toggle.
 */

import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { getPersonaVector, computeInterestMatch, normaliseTag } from "@/lib/personaService";
import { getSystemToggles } from "@/lib/systemToggles";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ForumPostModel } from "@/models/ForumPost";
import { logger } from "@/lib/logger";

const CANDIDATE_POOL = 80;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const tag   = searchParams.get("tag") ?? undefined;

    // Identify user
    const fp = getFingerprintFromRequest(request);
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const identityKey = fp ? `fp:${fp}` : `ip:${ip}`;

    const { personasEnabled } = getSystemToggles();

    await connectToDatabase();

    // Base filter
    const filter: Record<string, unknown> = { deleted_at: null };
    if (tag) filter.tags = tag;

    const candidates = await ForumPostModel.find(filter)
      .sort({ score: -1, created_at: -1 })
      .limit(CANDIDATE_POOL)
      .lean();

    if (!personasEnabled || candidates.length === 0) {
      const start = (page - 1) * limit;
      return NextResponse.json(
        { posts: candidates.slice(start, start + limit), personalized: false },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
      );
    }

    const personaVector = await getPersonaVector(identityKey, 30, true);

    if (personaVector.length === 0) {
      const start = (page - 1) * limit;
      return NextResponse.json(
        { posts: candidates.slice(start, start + limit), personalized: false },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    const seenTags = new Set<string>();

    const scored = candidates.map((post) => {
      const tags: string[] = (post.tags as string[] | undefined) ?? [];
      const hotScore = (post.score as number | undefined) ?? 0;
      const createdAt = (post.created_at as Date | undefined) ?? new Date(0);

      const interestMatch = computeInterestMatch(tags, tags[0] ?? "", personaVector);

      const hoursAgo = Math.max(0, (Date.now() - createdAt.getTime()) / 3_600_000);
      const recencyScore = Math.exp(-0.05 * hoursAgo);

      const normTags = tags.map(normaliseTag);
      const diversityBoost = normTags.some((t) => !seenTags.has(t)) ? 0.08 : -0.05;
      normTags.forEach((t) => seenTags.add(t));

      // Normalise hotScore to 0-1 (it can exceed 1 for viral posts)
      const normHot = Math.min(1, hotScore);

      const score =
        interestMatch * 0.40 +
        normHot       * 0.30 +
        recencyScore  * 0.20 +
        diversityBoost * 0.10;

      return { post, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const start = (page - 1) * limit;
    const page_results = scored.slice(start, start + limit).map((s) => s.post);

    return NextResponse.json(
      { posts: page_results, personalized: true },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (error) {
    logger.error({ error }, "GET /api/forums/feed error");
    return NextResponse.json({ error: "Failed to fetch personalized forum feed." }, { status: 500 });
  }
}
