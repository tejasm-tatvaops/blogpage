import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { populateBlogs, populateForums, type AutopopulateStats } from "@/lib/autopopulateService";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 min — long-running AI job

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { target?: unknown; limit?: unknown };
  try {
    body = (await request.json()) as { target?: unknown; limit?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const target = body.target;
  if (target !== "blogs" && target !== "forums" && target !== "both") {
    return NextResponse.json(
      { error: "target must be 'blogs', 'forums', or 'both'." },
      { status: 400 },
    );
  }

  const rawLimit = typeof body.limit === "number" ? body.limit : 20;
  const limit = Math.min(Math.max(1, Math.floor(rawLimit)), 20);

  logger.info({ target, limit }, "autopopulate: job started");

  try {
    const zero: AutopopulateStats = { postsProcessed: 0, commentsCreated: 0, repliesCreated: 0, errors: 0 };

    const merge = (a: AutopopulateStats, b: AutopopulateStats): AutopopulateStats => ({
      postsProcessed: a.postsProcessed + b.postsProcessed,
      commentsCreated: a.commentsCreated + b.commentsCreated,
      repliesCreated: a.repliesCreated + b.repliesCreated,
      errors: a.errors + b.errors,
    });

    let stats = zero;

    if (target === "blogs" || target === "both") {
      const blogStats = await populateBlogs(limit);
      stats = merge(stats, blogStats);
    }

    if (target === "forums" || target === "both") {
      const forumStats = await populateForums(limit);
      stats = merge(stats, forumStats);
    }

    logger.info({ target, stats }, "autopopulate: job complete");

    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Autopopulate failed.";
    logger.error({ target, error: message }, "autopopulate: job error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
