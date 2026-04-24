import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db/mongodb";
import { GenerationJobModel } from "@/models/GenerationJob";
import { logger } from "@/lib/logger";
import { generateDraftsFromForumTrends } from "@/lib/forumTrendDraftService";

export const maxDuration = 300;

async function runForumTrendDraftJob(jobId: string, count: number): Promise<void> {
  try {
    await GenerationJobModel.updateOne(
      { _id: jobId },
      { status: "running", started_at: new Date(), progress: 15 },
    );

    const result = await generateDraftsFromForumTrends({
      count,
      initiatorIdentityKey: "admin:system",
    });

    await GenerationJobModel.updateOne(
      { _id: jobId },
      {
        status: "completed",
        progress: 100,
        result: { ...result, elapsedMs: 0 },
        completed_at: new Date(),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ jobId, error: message }, "forum trend draft job failed");
    await GenerationJobModel.updateOne(
      { _id: jobId },
      { status: "failed", error: message, completed_at: new Date() },
    );
  }
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { count?: unknown } = {};
  try {
    body = (await request.json()) as { count?: unknown };
  } catch {
    body = {};
  }

  const rawCount = typeof body.count === "number" ? body.count : 5;
  const count = Math.min(Math.max(1, Math.floor(rawCount)), 12);

  await connectToDatabase();
  const job = await GenerationJobModel.create({
    type: "forum_trend_drafts",
    status: "pending",
    params: { count },
  });

  void runForumTrendDraftJob(String(job._id), count);
  return NextResponse.json({ jobId: String(job._id), status: "pending", count }, { status: 202 });
}

