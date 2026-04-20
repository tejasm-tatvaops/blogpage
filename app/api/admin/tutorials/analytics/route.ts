import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/mongodb";
import { TutorialModel } from "@/models/Tutorial";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { LearningPathModel } from "@/models/LearningPath";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  await connectToDatabase();

  const [totals, topTutorials, pathProgress] = await Promise.all([
    Promise.all([
      TutorialModel.countDocuments({ deleted_at: null }),
      TutorialModel.countDocuments({ deleted_at: null, published: true }),
      TutorialProgressModel.countDocuments({}),
      TutorialProgressModel.countDocuments({ completed: true }),
    ]),
    TutorialProgressModel.aggregate([
      { $group: { _id: "$tutorial_slug", started: { $sum: 1 }, completed: { $sum: { $cond: ["$completed", 1, 0] } }, avgProgress: { $avg: "$completion_percent" } } },
      { $sort: { completed: -1, started: -1 } },
      { $limit: 20 },
    ]),
    Promise.all([
      LearningPathModel.find({ published: true }).select("_id slug title").lean(),
      TutorialProgressModel.aggregate([
        { $match: { learning_path_id: { $ne: null } } },
        { $group: { _id: "$learning_path_id", avgProgress: { $avg: "$completion_percent" }, completions: { $sum: { $cond: ["$completed", 1, 0] } } } },
      ]),
    ]),
  ]);

  const [totalTutorials, publishedTutorials, progressRows, completedRows] = totals;
  const [paths, pathStats] = pathProgress;
  const pathStatMap = new Map(pathStats.map((r) => [String(r._id), r]));

  return NextResponse.json({
    totals: { totalTutorials, publishedTutorials, progressRows, completedRows },
    topTutorials,
    pathProgress: paths.map((p) => ({
      slug: p.slug,
      title: p.title,
      avgProgress: Number(pathStatMap.get(String(p._id))?.avgProgress ?? 0),
      completions: Number(pathStatMap.get(String(p._id))?.completions ?? 0),
    })),
  });
}
