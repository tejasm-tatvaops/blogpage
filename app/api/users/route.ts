import { NextResponse } from "next/server";
import {
  getPlatformViewTotals,
  getUserProfileViewTotals,
  getUserProfiles,
} from "@/lib/userProfileService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const userLimit = 1000;
    const [users, totals, userTotals] = await Promise.all([
      getUserProfiles(userLimit),
      getPlatformViewTotals(),
      getUserProfileViewTotals(),
    ]);
    const enrichedUsers = users.map((user) => ({
      ...user,
      is_real: user.identity_key.startsWith("google:"),
      is_anonymous: user.user_type === "ANONYMOUS",
    }));

    return NextResponse.json(
      { users: enrichedUsers, totals, userTotals },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}
