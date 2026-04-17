import { NextResponse } from "next/server";
import { z } from "zod";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { emitFeedEvent } from "@/lib/feedObservability";
import { recordInterest } from "@/lib/personaService";
import { invalidateFeedCache } from "@/lib/feedCache";

const bodySchema = z.object({
  eventType: z.enum(["post_clicked", "post_liked", "dwell_time", "skip"]),
  postSlug: z.string().trim().min(1).max(220).optional(),
  tags: z.array(z.string().trim().max(100)).max(10).optional(),
  category: z.string().trim().max(100).optional(),
  dwellMs: z.number().int().min(0).max(1_800_000).optional(),
  experimentId: z.string().trim().max(100).optional(),
  variantId: z.string().trim().max(100).optional(),
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
  await emitFeedEvent({
    identityKey,
    eventType: body.eventType,
    postSlug: body.postSlug,
    tags: body.tags,
    category: body.category,
    dwellMs: body.dwellMs,
    experimentId: body.experimentId,
    variantId: body.variantId,
  });

  if (body.eventType === "skip" || (body.eventType === "dwell_time" && (body.dwellMs ?? 0) < 5000)) {
    await recordInterest({
      identityKey,
      tags: body.tags ?? [],
      category: body.category,
      action: body.eventType === "skip" ? "skip" : "low_dwell",
    });
    await invalidateFeedCache(identityKey);
  }

  return NextResponse.json({ ok: true });
}
