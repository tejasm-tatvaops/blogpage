import { NextRequest, NextResponse } from "next/server";
import { emitFeedEvent } from "@/lib/feedObservability";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { awardPoints } from "@/lib/reputationEngine";

const VALID_CHANNELS = new Set([
  "twitter",
  "linkedin",
  "whatsapp",
  "email",
  "instagram",
  "threads",
  "copy",
]);

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * POST /api/blog/[slug]/share
 * Body: { channel: string }
 *
 * Records a share event into the FeedEvent pipeline.
 * Fire-and-forget from the client — returns 202 immediately.
 * metadata.channel is used by channelIntelligence to rank channel performance.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  let channel = "unknown";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const raw = String(body.channel ?? "").toLowerCase().trim();
    if (VALID_CHANNELS.has(raw)) channel = raw;
  } catch {
    // ignore parse errors — we still record the event
  }

  const fingerprintId = getFingerprintFromRequest(req);
  const ipAddress =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const identityKey = fingerprintId ? `fp:${fingerprintId}` : `ip:${ipAddress ?? "anonymous"}`;

  // Reputation: award content_share points to the sharer (fire-and-forget)
  void awardPoints({
    identityKey,
    reason: "content_share",
    sourceContentSlug: slug,
    sourceContentType: "blog",
    eventKey: `blog-share:${identityKey}:${slug}:${channel}:${Math.floor(Date.now() / 3_600_000)}`,
  });

  // Non-blocking: emit then return immediately
  emitFeedEvent({
    identityKey,
    eventType: "share",
    postSlug: slug,
    metadata: { channel },
  }).catch(() => {
    // queue failure is non-fatal for share tracking
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
