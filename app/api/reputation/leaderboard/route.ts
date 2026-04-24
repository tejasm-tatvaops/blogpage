import { NextResponse } from "next/server";
import { getReputationLeaderboard } from "@/lib/personaService";
import { BADGES } from "@/lib/services/reputation.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  try {
    const entries = await getReputationLeaderboard(limit);
    // Attach badge metadata for display
    const badgeMap = Object.fromEntries(BADGES.map((b) => [b.id, { label: b.label, description: b.description }]));
    return NextResponse.json({ leaderboard: entries, badge_definitions: badgeMap }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 });
  }
}
