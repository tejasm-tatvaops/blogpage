import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getPendingRevisions, approveRevision, rejectRevision, rollbackToRevision } from "@/lib/revisionService";

/** GET /api/admin/review-queue — list all pending revisions */
export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")  ?? 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

  const revisions = await getPendingRevisions(limit, offset);
  return NextResponse.json({ revisions, count: revisions.length });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action:        z.literal("approve"),
    revision_id:   z.string().trim().min(1),
    reviewer_note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action:        z.literal("reject"),
    revision_id:   z.string().trim().min(1),
    reviewer_note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action:      z.literal("rollback"),
    revision_id: z.string().trim().min(1),
    admin_note:  z.string().trim().max(500).optional(),
  }),
]);

/** POST /api/admin/review-queue — approve, reject, or rollback */
export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const data = parsed.data;

  if (data.action === "rollback") {
    const result = await rollbackToRevision(data.revision_id, data.admin_note ?? null);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Approve/reject: admin identity used as reviewer (bypasses tier check via
  // a sentinel admin key — admins are implicitly elite-tier)
  const ADMIN_IDENTITY = "admin:system";
  const ADMIN_NAME     = "TatvaOps Admin";

  // Temporarily grant admin identity elite tier so it passes isEligibleReviewer
  // by patching the UserProfileModel if needed — or we use a direct bypass flag.
  // Simplest approach: call the service with a known admin key and upsert the profile.
  const { connectToDatabase } = await import("@/lib/mongodb");
  const { UserProfileModel } = await import("@/models/UserProfile");
  await connectToDatabase();
  await UserProfileModel.updateOne(
    { identity_key: ADMIN_IDENTITY },
    {
      $setOnInsert: {
        display_name: "TatvaOps Admin",
        about: "System admin account.",
        avatar_url: "/tatvaops-logo.png",
      },
      $set: { reputation_tier: "elite", reputation_score: 9999 },
    },
    { upsert: true },
  );

  const result =
    data.action === "approve"
      ? await approveRevision(data.revision_id, ADMIN_IDENTITY, ADMIN_NAME, data.reviewer_note ?? null)
      : await rejectRevision(data.revision_id, ADMIN_IDENTITY, ADMIN_NAME, data.reviewer_note ?? null);

  if (!result.ok) return NextResponse.json({ error: (result as { reason?: string }).reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}
