import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { getReputationTier } from "@/models/UserProfile";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = String(session?.user?.id ?? "").trim();
    if (!userId) {
      return NextResponse.json({ score: 0, level: "member" }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    }

    await connectToDatabase();
    const profile = await UserProfileModel.findOne({ identity_key: `google:${userId}` })
      .select("reputation_score reputation_tier")
      .lean();
    const score = Number((profile as { reputation_score?: number } | null)?.reputation_score ?? 0);
    const level = String(
      (profile as { reputation_tier?: string } | null)?.reputation_tier
      ?? getReputationTier(score),
    );

    return NextResponse.json(
      { score, level },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ score: 0, level: "member" }, { status: 200 });
  }
}
