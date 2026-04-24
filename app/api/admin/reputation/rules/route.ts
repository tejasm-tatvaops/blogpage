import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import {
  ABUSE_MAX_PER_ACTOR,
  ABUSE_WINDOW_MS,
  BADGES,
  BASE_POINTS,
  BURST_LIMIT,
  BURST_WINDOW_MS,
  CROSS_CONTENT_MULTIPLIER,
  DAILY_CAP,
} from "@/lib/services/reputation.service";
import { REPUTATION_THRESHOLDS } from "@/models/UserProfile";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  return NextResponse.json({
    pointTable: BASE_POINTS,
    tiers: REPUTATION_THRESHOLDS,
    crossContentMultiplier: CROSS_CONTENT_MULTIPLIER,
    antiAbuse: {
      abuseWindowMs: ABUSE_WINDOW_MS,
      abuseMaxPerActor: ABUSE_MAX_PER_ACTOR,
      dailyCap: DAILY_CAP,
      burstLimit: BURST_LIMIT,
      burstWindowMs: BURST_WINDOW_MS,
    },
    badges: BADGES.map((badge) => ({
      id: badge.id,
      label: badge.label,
      description: badge.description,
      bonus: badge.bonus,
    })),
  });
}
