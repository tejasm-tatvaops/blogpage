import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ReputationEventModel } from "@/models/ReputationEvent";
import { UserProfileModel } from "@/models/UserProfile";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const windowDays = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? "14")));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  await connectToDatabase();

  const [distribution, growth, topContributors, suspiciousActors] = await Promise.all([
    ReputationEventModel.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: "$reason", points: { $sum: "$awarded_points" }, count: { $sum: 1 } } },
      { $sort: { points: -1 } },
      { $limit: 30 },
    ]),
    ReputationEventModel.aggregate([
      { $match: { created_at: { $gte: since } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          },
          points: { $sum: "$awarded_points" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]),
    UserProfileModel.find({}).sort({ reputation_score: -1 }).limit(20)
      .select("identity_key display_name reputation_score reputation_tier forum_badges")
      .lean(),
    ReputationEventModel.aggregate([
      { $match: { created_at: { $gte: since }, actor_identity_key: { $ne: null } } },
      { $group: { _id: "$actor_identity_key", count: { $sum: 1 }, points: { $sum: "$awarded_points" } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
  ]);

  return NextResponse.json({
    windowDays,
    distribution,
    growth,
    topContributors,
    suspiciousActors,
  });
}
