/**
 * GET /api/blog/feed
 *
 * V2 personalized feed endpoint — multi-stage ranking pipeline.
 *
 * FLOW
 * ────
 *   1. Resolve caller identity (fingerprint cookie → IP fallback)
 *   2. Cache check  → return immediately if warm
 *   3. Fetch persona vector with read-time decay applied
 *   4. buildFeed() → 3-bucket candidate generation + 5-component scoring + diversity
 *   5. Write result to cache (TTL: 3 min)
 *   6. Return feed + debug meta (bucket distribution, top interests)
 *
 * QUERY PARAMS
 * ────────────
 *   page      — integer, default 1
 *   limit     — integer 1-50, default 20
 *   category  — optional string
 *
 * RESPONSE
 * ────────
 *   { posts, page, has_persona, top_interests, bucket_distribution }
 */

import { NextResponse } from "next/server";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { getAuthorAffinityMap, getPersonaVector } from "@/lib/personaService";
import { buildFeed, fetchTopicPrefs } from "@/lib/feedService";
import {
  feedCacheKey,
  getCachedFeed,
  setCachedFeed,
} from "@/lib/feedCache";
import { assignFeedVariant } from "@/lib/feedExperiments";
import { emitFeedEvent } from "@/lib/feedObservability";
import { markFeedIdentityHot, startFeedPrecomputeWorker } from "@/lib/feedPrecompute";
import { parseSessionDiversityCookie, updateSessionDiversityState } from "@/lib/sessionDiversity";
import { logger } from "@/lib/logger";
import type { FeedResult } from "@/lib/feedService";
import { getAllPosts } from "@/lib/blogService";
import { startReconciliationWorker } from "@/lib/reconciliationService";
import { recordLatency } from "@/lib/perfMetrics";

export const dynamic = "force-dynamic";

const withTimeout = async <T>(label: string, promise: Promise<T>, timeoutMs = 2000): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

export async function GET(request: Request) {
  const startedAt = Date.now();
  let lastStageAt = startedAt;
  const stageTimings: Record<string, number> = {};
  const markStage = (name: string): void => {
    const now = Date.now();
    stageTimings[name] = now - lastStageAt;
    lastStageAt = now;
  };
  try {
    logger.info("feed: start");
    startFeedPrecomputeWorker();
    startReconciliationWorker();
    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
    const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const category = searchParams.get("category")?.trim() || undefined;

    // ── 1. Identity ──────────────────────────────────────────────────────────
    const fingerprintId = getFingerprintFromRequest(request);
    const ipAddress =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const identityKey = fingerprintId
      ? `fp:${fingerprintId}`
      : `ip:${ipAddress ?? "anonymous"}`;
    markFeedIdentityHot(identityKey);
    const variant = assignFeedVariant(identityKey);
    const requestId = `feed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const cookieHeader = request.headers.get("cookie") ?? "";
    const sessionCookieMatch = cookieHeader.match(/(?:^|;\s*)tatvaops_feed_session=([^;]+)/);
    const sessionDiversity = parseSessionDiversityCookie(
      sessionCookieMatch?.[1] ? decodeURIComponent(sessionCookieMatch[1]) : null,
    );

    // Dev-mode safe fallback path: avoid heavy ranking/caching/eventing by default.
    // Set FEED_DEV_FULL_PIPELINE=true to validate full production pipeline in development.
    const fullDevPipeline = process.env.FEED_DEV_FULL_PIPELINE === "true";
    if (process.env.NODE_ENV === "development" && !fullDevPipeline) {
      const posts = await withTimeout(
        "dev simple feed",
        getAllPosts({ sort: "latest", category, limit: Math.min(10, limit) }),
        2000,
      ).catch(() => []);
      logger.info({ count: posts.length }, "feed: before return (dev fallback)");
      const totalMs = Date.now() - startedAt;
      recordLatency("feed.request.total", totalMs);
      recordLatency("feed.stage.dev_bypass", totalMs);
      return NextResponse.json(
        {
          posts,
          page,
          has_persona: false,
          top_interests: [],
          bucket_distribution: { personalized: 0, trending: posts.length, exploration: 0 },
          _cache: "dev-bypass",
        },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // ── 2. Cache check ───────────────────────────────────────────────────────
    const cacheKey = feedCacheKey(identityKey, page, limit, category);
    const cached   = await withTimeout("feed cache read", getCachedFeed<FeedResult>(cacheKey), 500);
    markStage("cache_read");
    recordLatency("feed.stage.cache_read", stageTimings.cache_read ?? 0);
    if (cached) {
      const response = NextResponse.json(
        { ...cached, _cache: "hit", request_id: requestId, experiment_id: variant.experimentId, variant_id: variant.variantId },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies.set(
        "tatvaops_feed_session",
        encodeURIComponent(JSON.stringify(updateSessionDiversityState(sessionDiversity, cached.session_updates?.recent_tags_seen ?? [], cached.session_updates?.recent_authors_seen ?? []))),
        { httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 6, path: "/" },
      );
      const totalMs = Date.now() - startedAt;
      recordLatency("feed.request.total", totalMs);
      recordLatency("feed.request.cache_hit_total", totalMs);
      return response;
    }

    // ── 3. Persona vector (with read-time decay) + topic preferences ─────────
    const [personaVector, authorAffinity, topicPreferences] = await Promise.all([
      withTimeout("persona vector", getPersonaVector(identityKey, 30, true), 2000),
      withTimeout("author affinity", getAuthorAffinityMap(identityKey).catch(() => ({})), 1000),
      withTimeout("topic prefs", fetchTopicPrefs(identityKey).catch(() => null), 500),
    ]);
    markStage("persona_fetch");
    recordLatency("feed.stage.persona_fetch", stageTimings.persona_fetch ?? 0);
    logger.info({ size: personaVector.length }, "feed: after persona");

    // ── 4. Build feed ────────────────────────────────────────────────────────
    const result = await withTimeout(
      "build feed",
      buildFeed({
      personaVector,
      limit,
      page,
      category,
      sessionRecent: {
        tags: sessionDiversity.recent_tags_seen,
        authors: sessionDiversity.recent_authors_seen,
      },
      authorAffinity,
      topicPreferences,
      scoringWeights: variant.weights,
      onStage: (stage) => {
        if (stage === "candidates") {
          markStage("candidate_generation");
          recordLatency("feed.stage.candidate_generation", stageTimings.candidate_generation ?? 0);
          logger.info("feed: after candidates");
        }
        if (stage === "scoring") {
          markStage("scoring");
          recordLatency("feed.stage.scoring", stageTimings.scoring ?? 0);
          logger.info("feed: after scoring");
        }
      },
      }),
      2500,
    );
    markStage("build_feed_total");
    recordLatency("feed.stage.build_feed_total", stageTimings.build_feed_total ?? 0);

    // ── 5. Write cache ────────────────────────────────────────────────────────
    await withTimeout("feed cache write", setCachedFeed(cacheKey, result), 500).catch(() => undefined);
    markStage("cache_write");
    recordLatency("feed.stage.cache_write", stageTimings.cache_write ?? 0);
    const enqueueStart = Date.now();
    void emitFeedEvent({
      identityKey,
      eventType: "feed_served",
      experimentId: variant.experimentId,
      variantId: variant.variantId,
      requestId,
      metadata: {
        page,
        limit,
        category: category ?? null,
        post_slugs: result.posts.map((p) => p.slug).slice(0, 20),
      },
    })
      .then(() => {
        recordLatency("feed.stage.event_enqueue_async", Date.now() - enqueueStart);
      })
      .catch(() => undefined);
    markStage("event_enqueue");
    recordLatency("feed.stage.event_enqueue", stageTimings.event_enqueue ?? 0);

    // ── 6. Respond ────────────────────────────────────────────────────────────
    const response = NextResponse.json(
      { ...result, _cache: "miss", request_id: requestId, experiment_id: variant.experimentId, variant_id: variant.variantId },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(
      "tatvaops_feed_session",
      encodeURIComponent(JSON.stringify(updateSessionDiversityState(sessionDiversity, result.session_updates?.recent_tags_seen ?? [], result.session_updates?.recent_authors_seen ?? []))),
      { httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 6, path: "/" },
    );
    logger.info({ count: result.posts.length }, "feed: before return");
    const totalMs = Date.now() - startedAt;
    recordLatency("feed.request.total", totalMs);
    recordLatency("feed.request.cache_miss_total", totalMs);
    return response;
  } catch (error) {
    recordLatency("feed.request.error_total", Date.now() - startedAt);
    logger.error({ error }, "GET /api/blog/feed error");
    return NextResponse.json({ error: "Failed to fetch feed." }, { status: 500 });
  }
}
