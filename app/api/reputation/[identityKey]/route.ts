import { NextResponse } from "next/server";
import { getReputationBreakdown } from "@/lib/reputationEngine";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

type RouteContext = { params: Promise<{ identityKey: string }> };

/**
 * GET /api/reputation/[identityKey]
 *
 * Returns a per-category breakdown of reputation points for a user.
 * Computed live from the ReputationEvent ledger using current BASE_POINTS.
 * Rate-limited; no auth required (identityKey is an opaque fingerprint hash).
 */
export async function GET(request: Request, { params }: RouteContext) {
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { identityKey } = await params;
  const decoded = decodeURIComponent(identityKey).trim();

  if (!decoded) {
    return NextResponse.json({ error: "identityKey required." }, { status: 400 });
  }

  try {
    const result = await getReputationBreakdown(decoded);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to compute breakdown." }, { status: 500 });
  }
}
