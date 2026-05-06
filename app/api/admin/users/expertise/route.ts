import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { deriveExpertiseBadge } from "@/lib/expertiseIdentity";

const payloadSchema = z.object({
  identityKey: z.string().min(3),
  disabled: z.boolean().optional(),
  adminOverrideBadge: z.string().max(60).optional().nullable(),
});

export async function PATCH(request: Request) {
  const allowed = await requireAdminApiAccess();
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await connectToDatabase();
  const { identityKey, disabled, adminOverrideBadge } = parsed.data;
  const profile = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("profession expertise years_of_experience public_expertise_enabled reputation_score forum_comments blog_comments forum_posts")
    .lean();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const setData: Record<string, unknown> = {};
  if (typeof disabled === "boolean") setData.public_expertise_enabled = !disabled;
  if (adminOverrideBadge !== undefined) setData.expertise_badge_admin_override = adminOverrideBadge || null;

  const nextPublicEnabled =
    typeof setData.public_expertise_enabled === "boolean"
      ? Boolean(setData.public_expertise_enabled)
      : Boolean((profile as { public_expertise_enabled?: boolean }).public_expertise_enabled);

  setData.expertise_badge = deriveExpertiseBadge({
    profession: String((profile as { profession?: string }).profession ?? ""),
    expertise: String((profile as { expertise?: string }).expertise ?? ""),
    yearsOfExperience: String((profile as { years_of_experience?: string }).years_of_experience ?? ""),
    publicExpertiseEnabled: nextPublicEnabled,
    reputationScore: Number((profile as { reputation_score?: number }).reputation_score ?? 0),
    helpfulSignals:
      Number((profile as { forum_comments?: number }).forum_comments ?? 0) +
      Number((profile as { blog_comments?: number }).blog_comments ?? 0) +
      Number((profile as { forum_posts?: number }).forum_posts ?? 0),
    adminOverrideBadge: adminOverrideBadge ?? null,
  });

  await UserProfileModel.updateOne({ identity_key: identityKey }, { $set: setData });
  return NextResponse.json({ ok: true }, { status: 200 });
}
