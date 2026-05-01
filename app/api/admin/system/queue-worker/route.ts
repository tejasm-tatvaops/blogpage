import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import {
  flushFeedEventQueue,
  getFeedEventQueueHealth,
  reclaimStaleFeedProcessingEvents,
  replayFailedFeedEvents,
} from "@/lib/feedEventQueue";
import { getActivityQueueStats } from "@/lib/activityQueue";
import { runActivityTickOnce } from "@/lib/activityRunner";
import { getRedisClient } from "@/lib/redis";
import { drainRecoveryQueue } from "@/lib/recoveryQueue";

export const dynamic = "force-dynamic";
const WORKER_BATCH_SIZE = 20;
const WORKER_LOCK_KEY = "queue_worker_lock";
const WORKER_LOCK_TTL_MS = 30_000;
const WORKER_HEARTBEAT_MS = 10_000;

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    return NextResponse.json({ error: "Queue worker requires Redis." }, { status: 503 });
  }

  const lockToken = `${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const lock = await redis.set(WORKER_LOCK_KEY, lockToken, "PX", WORKER_LOCK_TTL_MS, "NX");
  if (!lock) {
    return NextResponse.json(
      { ok: false, status: "already_running" },
      { status: 409 },
    );
  }

  const startedAt = Date.now();
  const heartbeat = setInterval(async () => {
    try {
      const current = await redis.get(WORKER_LOCK_KEY);
      if (current === lockToken) {
        await redis.pexpire(WORKER_LOCK_KEY, WORKER_LOCK_TTL_MS);
      }
    } catch {
      // Best effort lock refresh.
    }
  }, WORKER_HEARTBEAT_MS);

  try {
    const [staleReclaimed, feedFlush, replayed, recovery] = await Promise.all([
      reclaimStaleFeedProcessingEvents(),
      flushFeedEventQueue(WORKER_BATCH_SIZE),
      replayFailedFeedEvents(WORKER_BATCH_SIZE),
      drainRecoveryQueue(WORKER_BATCH_SIZE),
    ]);

    await runActivityTickOnce();
    const [activityQueue, feedQueueHealth] = await Promise.all([
      getActivityQueueStats(),
      getFeedEventQueueHealth(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        elapsed_ms: Date.now() - startedAt,
        feed_events: {
          processed: feedFlush.processed,
          failed: feedFlush.failed,
          replayed,
          remaining: feedQueueHealth.queued,
          processing: feedQueueHealth.processing,
          lag_ms: feedQueueHealth.oldestLagMs,
          success_count: feedQueueHealth.successCount,
          failure_count: feedQueueHealth.failureCount,
          success_rate: feedQueueHealth.successRate,
          stale_reclaimed: staleReclaimed,
        },
        recovery_queue: recovery,
        activity_queue: {
          ...activityQueue,
          remaining: activityQueue.total,
        },
      },
      { status: 200 },
    );
  } finally {
    clearInterval(heartbeat);
    try {
      await redis.eval(
        `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
          end
          return 0
        `,
        1,
        WORKER_LOCK_KEY,
        lockToken,
      );
    } catch {
      // Best effort unlock.
    }
  }
}
