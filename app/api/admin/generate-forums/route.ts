import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { generateForumThreads } from "@/lib/forumGenerator";
import { connectToDatabase } from "@/lib/mongodb";
import { GenerationJobModel } from "@/models/GenerationJob";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

// Runs after the HTTP response is sent — updates the job record as it progresses.
async function runForumGenerationJob(jobId: string, count: number): Promise<void> {
  try {
    await GenerationJobModel.updateOne(
      { _id: jobId },
      { status: "running", started_at: new Date(), progress: 10 },
    );

    const result = await generateForumThreads(count);

    await GenerationJobModel.updateOne(
      { _id: jobId },
      {
        status: "completed",
        progress: 100,
        result: { created: result.created, skipped: result.skipped, failed: result.failed, elapsedMs: result.elapsedMs },
        completed_at: new Date(),
      },
    );

    if (result.created > 0) {
      revalidatePath("/forums");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ jobId, error: message }, "forum generation job failed");
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
  const count = Math.min(Math.max(1, Math.floor(rawCount)), 20);

  await connectToDatabase();

  const job = await GenerationJobModel.create({
    type: "generate_forums",
    status: "pending",
    params: { count },
  });

  // Fire and forget — client polls /api/admin/jobs/[id] for status.
  void runForumGenerationJob(String(job._id), count);

  return NextResponse.json(
    { jobId: String(job._id), status: "pending", count },
    { status: 202 },
  );
}
