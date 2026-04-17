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
      getUserProfiles(userLimit).catch(() => []),
      getPlatformViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })),
      getUserProfileViewTotals().catch(() => ({ blogViews: 0, forumViews: 0 })),
    ]);

    console.log("users fetched:", users.length);
    return NextResponse.json(
      {
        users: users || [],
        totals: totals || { blogViews: 0, forumViews: 0 },
        userTotals: userTotals || { blogViews: 0, forumViews: 0 },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("users api error:", error);
    return NextResponse.json(
      {
        users: [],
        totals: { blogViews: 0, forumViews: 0 },
        userTotals: { blogViews: 0, forumViews: 0 },
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
