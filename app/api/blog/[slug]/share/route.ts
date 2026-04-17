import { NextRequest, NextResponse } from "next/server";
import { emitFeedEvent } from "@/lib/feedObservability";
import { getFingerprintFromRequest } from "@/lib/fingerprint";

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

  const identityKey = getFingerprintFromRequest(req) ?? "anonymous";

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
