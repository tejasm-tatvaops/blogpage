import { NextResponse } from "next/server";
import {
  getPlatformViewTotals,
  getUserProfileViewTotals,
  getUserProfiles,
} from "@/lib/userProfileService";
import { getUserType } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawType = (searchParams.get("type") ?? searchParams.get("filter") ?? "").toLowerCase();
    const typeFilter = rawType === "real" || rawType === "anonymous" || rawType === "system"
      ? rawType
      : "all";

    const userLimit = 1000;
    const [users, totals, userTotals] = await Promise.all([
      getUserProfiles(userLimit),
      getPlatformViewTotals(),
      getUserProfileViewTotals(),
    ]);
    const filteredUsers = users.filter((user) => {
      const type = getUserType(user.identity_key);
      if (typeFilter === "all") return true;
      if (typeFilter === "real") return type === "REAL";
      if (typeFilter === "anonymous") return type === "ANONYMOUS";
      return type === "SYSTEM";
    });
    const enrichedUsers = filteredUsers.map((user) => ({
      ...user,
      user_type: getUserType(user.identity_key),
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
