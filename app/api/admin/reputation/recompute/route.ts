import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { recomputeReputationScore, getReputationScore } from "@/lib/reputationEngine";

const BATCH_SIZE = 50;
const DRY_RUN_SAMPLE = 5;

/**
 * POST /api/admin/reputation/recompute
 *
 * Re-applies the current BASE_POINTS table to every user's ledger history
 * and writes the corrected score + tier back to UserProfile.
 *
 * Body (all optional):
 *   { identity_key?: string }   — single-user fast path
 *   { dryRun?: true }           — compute diffs, do NOT write to DB
 *
 * Returns:
 *   Global:   { total, processed, updated, errors }
 *   Single:   { total: 1, processed: 1, updated: 1, errors: 0, score: number }
 *   Dry run:  { dryRun: true, wouldUpdate: number, sampleChanges: [...] }
 */
export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  await connectToDatabase();

  let singleKey: string | null = null;
  let dryRun = false;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.identity_key === "string" && body.identity_key.trim()) {
      singleKey = body.identity_key.trim();
    }
    if (body.dryRun === true) dryRun = true;
  } catch {
    // empty body → global live recompute
  }

  // ── Single-user fast path ──────────────────────────────────────────────────
  if (singleKey) {
    try {
      const newScore = await recomputeReputationScore(singleKey, { syncToProfile: !dryRun });
      if (dryRun) {
        const current = await getReputationScore(singleKey);
        return NextResponse.json({
          dryRun: true,
          wouldUpdate: 1,
          sampleChanges: [{ identity_key: singleKey, current, recomputed: newScore, delta: newScore - current }],
        });
      }
      return NextResponse.json({ total: 1, processed: 1, updated: 1, errors: 0, score: newScore });
    } catch {
      return NextResponse.json({ error: "Recompute failed for user." }, { status: 500 });
    }
  }

  // ── Fetch all identity keys ────────────────────────────────────────────────
  const keys = await UserProfileModel.find({})
    .select("identity_key")
    .lean()
    .then((docs) => docs.map((d) => String(d.identity_key ?? "")));

  const total = keys.length;

  // ── Dry run: sample first N users, show diffs, never write ────────────────
  if (dryRun) {
    const sample = await Promise.allSettled(
      keys.slice(0, DRY_RUN_SAMPLE).map(async (key) => {
        const [current, recomputed] = await Promise.all([
          getReputationScore(key),
          recomputeReputationScore(key, { syncToProfile: false }),
        ]);
        return { identity_key: key, current, recomputed, delta: recomputed - current };
      }),
    );
    return NextResponse.json({
      dryRun: true,
      wouldUpdate: total,
      sampleChanges: sample
        .filter((r): r is PromiseFulfilledResult<{ identity_key: string; current: number; recomputed: number; delta: number }> => r.status === "fulfilled")
        .map((r) => r.value),
    });
  }

  // ── Global live recompute (batched) ───────────────────────────────────────
  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (key) => {
        processed += 1;
        try {
          await recomputeReputationScore(key, { syncToProfile: true });
          updated += 1;
        } catch {
          errors += 1;
        }
      }),
    );
  }

  return NextResponse.json({ total, processed, updated, errors });
}
