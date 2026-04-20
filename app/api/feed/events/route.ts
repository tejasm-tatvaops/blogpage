import { NextResponse } from "next/server";
import { z } from "zod";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { emitFeedEvent } from "@/lib/feedObservability";
import { recordAuthorAffinity, recordInterest } from "@/lib/personaService";
import { invalidateFeedCache } from "@/lib/feedCache";
import { getPostBySlug } from "@/lib/blogService";
import { getForumPostBySlug, registerForumDwellSignal } from "@/lib/forumService";
import { onCrossContentLink } from "@/lib/reputationEngine";
import type { RepContentType } from "@/models/ReputationEvent";
import { getSystemToggles } from "@/lib/systemToggles";
import { recordMetric } from "@/lib/observability";

const bodySchema = z.object({
  eventType: z.enum(["post_clicked", "post_liked", "dwell_time", "skip", "cross_content_click", "recommendation_click", "recommendation_impression"]),
  postSlug: z.string().trim().min(1).max(220).optional(),
  tags: z.array(z.string().trim().max(100)).max(10).optional(),
  category: z.string().trim().max(100).optional(),
  dwellMs: z.number().int().min(0).max(1_800_000).optional(),
  experimentId: z.string().trim().max(100).optional(),
  variantId: z.string().trim().max(100).optional(),
  requestId: z.string().trim().max(100).optional(),
  position: z.number().int().min(0).max(500).optional(),
  interactionDepth: z.enum(["low", "medium", "high"]).optional(),
  author: z.string().trim().max(120).optional(),
  // Cross-content tracking: source and destination content types
  sourceContentType: z.enum(["blog", "forum", "short", "tutorial"]).optional(),
  targetContentType: z.enum(["blog", "forum", "short", "tutorial"]).optional(),
});

const identityFromRequest = (request: Request): string => {
  const fp = getFingerprintFromRequest(request);
  if (fp) return `fp:${fp}`;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";
  return `ip:${ip}`;
};

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const identityKey = identityFromRequest(request);
  const body = parsed.data;
  const safeAuthorKey = body.author?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const postForSignals =
    body.postSlug && (!body.author || body.eventType === "post_clicked" || body.eventType === "post_liked" || body.eventType === "skip")
      ? await getPostBySlug(body.postSlug).catch(() => null)
      : null;
  const forumPostForSignals =
    !postForSignals && body.postSlug
      ? await getForumPostBySlug(body.postSlug).catch(() => null)
      : null;
  const authorKey =
    safeAuthorKey ??
    postForSignals?.author.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") ??
    null;

  await emitFeedEvent({
    identityKey,
    eventType: body.eventType,
    postSlug: body.postSlug,
    tags: body.tags ?? postForSignals?.tags ?? [],
    category: body.category ?? postForSignals?.category ?? forumPostForSignals?.tags?.[0] ?? null,
    dwellMs: body.dwellMs,
    experimentId: body.experimentId,
    variantId: body.variantId,
    requestId: body.requestId,
    position: body.position,
    interactionDepth: body.interactionDepth,
    authorKey,
    sourceContentType: body.sourceContentType ?? null,
    targetContentType: body.targetContentType ?? null,
  });

  if (body.eventType === "recommendation_click" || body.eventType === "recommendation_impression") {
    recordMetric("recommendation.click", {
      event_type: body.eventType,
      identity_key: identityKey,
      post_slug: body.postSlug ?? null,
      source_content_type: body.sourceContentType ?? null,
      target_content_type: body.targetContentType ?? null,
      position: body.position ?? null,
    });
  }

  // Cross-content click: boost persona signal + award reputation multiplier
  if (
    body.eventType === "cross_content_click" &&
    body.sourceContentType &&
    body.targetContentType &&
    getSystemToggles().crossContentSignalsEnabled
  ) {
    await recordInterest({
      identityKey,
      tags: body.tags ?? postForSignals?.tags ?? forumPostForSignals?.tags ?? [],
      category: body.category ?? postForSignals?.category ?? forumPostForSignals?.tags?.[0],
      action: "view",
    });
    if (getSystemToggles().reputationEnabled) {
      void onCrossContentLink(
        identityKey,
        body.sourceContentType as RepContentType,
        body.targetContentType as RepContentType,
        body.postSlug ?? "",
      );
    }
    await invalidateFeedCache(identityKey);
  }

  if (body.eventType === "post_clicked" || body.eventType === "post_liked") {
    await recordInterest({
      identityKey,
      tags: body.tags ?? postForSignals?.tags ?? forumPostForSignals?.tags ?? [],
      category: body.category ?? postForSignals?.category ?? forumPostForSignals?.tags?.[0],
      action: body.eventType === "post_liked" ? "like" : "view",
    });
    if (authorKey) {
      await recordAuthorAffinity({
        identityKey,
        authorKey,
        delta: body.eventType === "post_liked" ? 3 : 1,
      });
    }
    await invalidateFeedCache(identityKey);
  }

  if (body.eventType === "skip" || (body.eventType === "dwell_time" && (body.dwellMs ?? 0) < 5000)) {
    const isFastSkip = body.eventType === "skip" && (body.dwellMs ?? 0) > 0 && (body.dwellMs ?? 0) < 2000;
    await recordInterest({
      identityKey,
      tags: body.tags ?? postForSignals?.tags ?? forumPostForSignals?.tags ?? [],
      category: body.category ?? postForSignals?.category ?? forumPostForSignals?.tags?.[0],
      action: body.eventType === "skip" ? (isFastSkip ? "fast_skip" : "skip") : "low_dwell",
    });
    if (authorKey) {
      await recordAuthorAffinity({
        identityKey,
        authorKey,
        delta: isFastSkip ? -3 : -1,
      });
    }
    await invalidateFeedCache(identityKey);
    if (forumPostForSignals?.slug) {
      await registerForumDwellSignal({
        slug: forumPostForSignals.slug,
        dwellMs: body.dwellMs,
        isSkip: body.eventType === "skip",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
