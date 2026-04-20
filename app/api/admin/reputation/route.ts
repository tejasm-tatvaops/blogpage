import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { awardPoints } from "@/lib/reputationEngine";
import { getReputationHistory } from "@/lib/reputationEngine";

const adjustSchema = z.object({
  identity_key: z.string().trim().min(1).max(200),
  points: z.number().int().min(-10_000).max(10_000),
  note: z.string().trim().max(300).optional(),
});

/** POST /api/admin/reputation — manual point adjustment */
export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const { identity_key, points, note } = parsed.data;
  await awardPoints({
    identityKey: identity_key,
    reason: "manual_admin_adjustment",
    pointsOverride: points,
    note: note ?? `Admin manual adjustment: ${points > 0 ? "+" : ""}${points}`,
    eventKey: `admin-adjustment:${identity_key}:${points}:${(note ?? "").slice(0, 80)}:${new Date().toISOString().slice(0, 16)}`,
    skipBadgeCheck: false,
  });

  return NextResponse.json({ ok: true, awarded: points });
}

/** GET /api/admin/reputation?identity_key=... — view a user's history */
export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const identityKey = searchParams.get("identity_key");
  if (!identityKey) return NextResponse.json({ error: "identity_key required." }, { status: 400 });

  const limit  = Math.min(200, Math.max(1, Number(searchParams.get("limit")  ?? 100)));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

  const history = await getReputationHistory(identityKey, limit, offset);
  return NextResponse.json({ history });
}
