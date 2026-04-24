import { NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { getUserType } from "@/lib/identity";

type LeaderboardTypeFilter = "REAL" | "SYSTEM";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type")?.toUpperCase() ?? "";
    const typeFilter: LeaderboardTypeFilter | null =
      typeParam === "REAL" || typeParam === "SYSTEM" ? (typeParam as LeaderboardTypeFilter) : null;

    const sortStage: Record<string, 1 | -1> = {
      reputation_score: -1,
      user_type_sort: 1,
      identity_key: 1,
    };
    const matchStage: PipelineStage.Match | null =
      typeFilter === "REAL"
        ? { $match: { identity_key: { $regex: /^google:/ } } }
        : typeFilter === "SYSTEM"
          ? { $match: { identity_key: { $not: /^(google:|fp:|ip:)/ } } }
          : null;

    const pipeline: PipelineStage[] = [
      ...(matchStage ? [matchStage] : []),
      {
        $addFields: {
          user_type_sort: {
            $cond: [{ $regexMatch: { input: "$identity_key", regex: /^google:/ } }, 0, 1],
          },
        },
      },
      { $sort: sortStage },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          identity_key: 1,
          display_name: 1,
          reputation_score: { $ifNull: ["$reputation_score", 0] },
          user_type: 1,
        },
      },
    ];

    const rows = await UserProfileModel.aggregate<{
      identity_key: string;
      display_name: string;
      reputation_score: number;
      user_type: "REAL" | "ANONYMOUS" | "SYSTEM";
    }>(pipeline);

    const leaderboard = rows.map((row, index) => ({
      identity_key: row.identity_key,
      display_name: row.display_name,
      reputation_score: row.reputation_score,
      user_type: getUserType(row.identity_key),
      rank: index + 1,
    }));

    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaderboard." }, { status: 500 });
  }
}
