import { connectToDatabase } from "@/lib/db/mongodb";
import { logger } from "@/lib/logger";
import { FeedEventModel } from "@/models/FeedEvent";
import { FailedFeedEventModel } from "@/models/FailedFeedEvent";
import type { FeedEventInput } from "@/lib/feedObservability";
import { getRedisClient } from "@/lib/redis";

type QueueItem = {
  payload: FeedEventInput;
  attempts: number;
  enqueuedAt: number;
};

type ProcessingItem = {
  raw: string;
  parsed: QueueItem;
};

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 4;
const FEED_EVENT_QUEUE_KEY = "queue:feed_events:list";
const FEED_EVENT_PROCESSING_KEY = "queue:feed_events:processing";
const FEED_EVENT_PROCESSING_LEASE_KEY = "queue:feed_events:processing_lease";
const FEED_EVENT_SUCCESS_COUNT_KEY = "queue:feed_events:metrics:success";
const FEED_EVENT_FAILURE_COUNT_KEY = "queue:feed_events:metrics:failure";
const FEED_EVENT_BACKPRESSURE_THRESHOLD = 10_000;
const LOW_PRIORITY_EVENT_TYPES = new Set<FeedEventInput["eventType"]>([
  "feed_served",
  "recommendation_impression",
  "skip",
]);

const toFeedDoc = (payload: FeedEventInput) => ({
  identity_key: payload.identityKey,
  event_type: payload.eventType,
  post_slug: payload.postSlug ?? null,
  tags: payload.tags ?? [],
  category: payload.category ?? null,
  dwell_ms: payload.dwellMs ?? 0,
  experiment_id: payload.experimentId ?? "feed_v3",
  variant_id: payload.variantId ?? "control",
  request_id: payload.requestId ?? null,
  position: payload.position ?? null,
  interaction_depth: payload.interactionDepth ?? null,
  author_key: payload.authorKey ?? null,
  metadata: payload.metadata ?? {},
});

const persistFailedBatch = async (items: QueueItem[], error: unknown): Promise<void> => {
  await connectToDatabase();
  const message = error instanceof Error ? error.message : String(error);
  await FailedFeedEventModel.insertMany(
    items.map((item) => ({
      event_type: item.payload.eventType,
      payload: toFeedDoc(item.payload),
      attempts: item.attempts,
      retries: item.attempts,
      last_error: message.slice(0, 1000),
      failed_at: new Date(),
      next_retry_at: new Date(Date.now() + 60_000),
      status: "pending",
    })),
    { ordered: false },
  );
};

const processBatch = async (batch: QueueItem[]): Promise<void> => {
  await connectToDatabase();
  await FeedEventModel.insertMany(batch.map((item) => toFeedDoc(item.payload)), { ordered: false });
};

const moveToProcessingBatch = async (batchSize: number): Promise<ProcessingItem[]> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") return [];

  const items: ProcessingItem[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    const raw = await redis.rpoplpush(FEED_EVENT_QUEUE_KEY, FEED_EVENT_PROCESSING_KEY);
    if (!raw) break;

    try {
      const parsed = JSON.parse(raw) as QueueItem;
      await redis.zadd(FEED_EVENT_PROCESSING_LEASE_KEY, String(Date.now()), raw);
      items.push({
        raw,
        parsed: {
          payload: parsed.payload,
          attempts: Number(parsed.attempts ?? 0),
          enqueuedAt: Number(parsed.enqueuedAt ?? Date.now()),
        },
      });
    } catch {
      await redis.lrem(FEED_EVENT_PROCESSING_KEY, 1, raw);
      await redis.zrem(FEED_EVENT_PROCESSING_LEASE_KEY, raw);
    }
  }

  return items;
};

export const flushFeedEventQueue = async (batchSize = BATCH_SIZE): Promise<{
  processed: number;
  failed: number;
}> => {
  const moved = await moveToProcessingBatch(batchSize);
  if (moved.length === 0) return { processed: 0, failed: 0 };

  const batch = moved.map((item) => item.parsed);

  try {
    await processBatch(batch);
    const redis = getRedisClient();
    if (redis && redis.status === "ready") {
      await redis.incrby(FEED_EVENT_SUCCESS_COUNT_KEY, batch.length);
      await Promise.all(
        moved.map(async (item) => {
          await redis.lrem(FEED_EVENT_PROCESSING_KEY, 1, item.raw);
          await redis.zrem(FEED_EVENT_PROCESSING_LEASE_KEY, item.raw);
        }),
      );
    }
    return { processed: batch.length, failed: 0 };
  } catch (error) {
    const redis = getRedisClient();
    const retryable = moved.filter((item) => item.parsed.attempts + 1 < MAX_ATTEMPTS);
    const exhausted = moved.filter((item) => item.parsed.attempts + 1 >= MAX_ATTEMPTS);

    if (redis && redis.status === "ready") {
      await redis.incrby(FEED_EVENT_FAILURE_COUNT_KEY, exhausted.length);
      if (retryable.length > 0) {
        await redis.lpush(
          FEED_EVENT_QUEUE_KEY,
          ...retryable.map((item) =>
            JSON.stringify({
              payload: item.parsed.payload,
              attempts: item.parsed.attempts + 1,
              enqueuedAt: item.parsed.enqueuedAt,
            } satisfies QueueItem),
          ),
        );
      }
      await Promise.all(
        moved.map(async (item) => {
          await redis.lrem(FEED_EVENT_PROCESSING_KEY, 1, item.raw);
          await redis.zrem(FEED_EVENT_PROCESSING_LEASE_KEY, item.raw);
        }),
      );
    }

    if (exhausted.length > 0) {
      await persistFailedBatch(
        exhausted.map((item) => ({ ...item.parsed, attempts: item.parsed.attempts + 1 })),
        error,
      );
    }

    logger.warn(
      {
        size: batch.length,
        retryable: retryable.length,
        exhausted: exhausted.length,
        error: error instanceof Error ? error.message : String(error),
      },
      "feed event batch failed",
    );

    return { processed: 0, failed: exhausted.length };
  }
};

export const replayFailedFeedEvents = async (batchSize = BATCH_SIZE): Promise<number> => {
  await connectToDatabase();
  const pending = await FailedFeedEventModel.find({
    status: "pending",
    next_retry_at: { $lte: new Date() },
  })
    .sort({ created_at: 1 })
    .limit(batchSize)
    .lean();

  if (pending.length === 0) return 0;
  const ids = pending.map((item) => item._id);

  try {
    await FeedEventModel.insertMany(
      pending.map((item) => item.payload),
      { ordered: false },
    );
    await FailedFeedEventModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "replayed", next_retry_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } },
    );
    return pending.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    await Promise.all(
      pending.map((item) =>
        FailedFeedEventModel.updateOne(
          { _id: item._id },
          {
            $set: {
              last_error: message.slice(0, 1000),
              next_retry_at: new Date(now + Math.max(1_000, 2 ** ((item.attempts ?? 0) + 1) * 500)),
            },
            $inc: { attempts: 1 },
          },
        ),
      ),
    );
    return 0;
  }
};

export const reclaimStaleFeedProcessingEvents = async (
  staleAfterMs = 120_000,
  batchSize = 50,
): Promise<number> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") return 0;

  const cutoff = Date.now() - staleAfterMs;
  const staleItems = await redis.zrangebyscore(
    FEED_EVENT_PROCESSING_LEASE_KEY,
    "-inf",
    cutoff,
    "LIMIT",
    0,
    batchSize,
  );

  if (staleItems.length === 0) return 0;

  let reclaimed = 0;
  for (const raw of staleItems) {
    const removed = await redis.lrem(FEED_EVENT_PROCESSING_KEY, 1, raw);
    await redis.zrem(FEED_EVENT_PROCESSING_LEASE_KEY, raw);
    if (removed > 0) {
      await redis.lpush(FEED_EVENT_QUEUE_KEY, raw);
      reclaimed += 1;
    }
  }
  return reclaimed;
};

export const ensureFeedEventQueueStarted = (): void => {
  // No-op in Redis-backed queue mode.
};

export const enqueueFeedEvent = async (payload: FeedEventInput): Promise<void> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    logger.warn("Feed event enqueue skipped: Redis unavailable");
    return;
  }

  const queueLen = Number(await redis.llen(FEED_EVENT_QUEUE_KEY));
  if (queueLen > FEED_EVENT_BACKPRESSURE_THRESHOLD && LOW_PRIORITY_EVENT_TYPES.has(payload.eventType)) {
    logger.warn({ queueLen, eventType: payload.eventType }, "Dropping low-priority feed event due to backpressure");
    return;
  }

  await redis.lpush(
    FEED_EVENT_QUEUE_KEY,
    JSON.stringify({
      payload,
      attempts: 0,
      enqueuedAt: Date.now(),
    } satisfies QueueItem),
  );
};

export const getFeedEventQueueHealth = async (): Promise<{
  queued: number;
  processing: number;
  oldestLagMs: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  flushing: boolean;
  replaying: boolean;
}> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    return {
      queued: 0,
      processing: 0,
      oldestLagMs: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      flushing: false,
      replaying: false,
    };
  }

  const [queued, processing, oldestRaw, successCountRaw, failureCountRaw] = await Promise.all([
    redis.llen(FEED_EVENT_QUEUE_KEY),
    redis.llen(FEED_EVENT_PROCESSING_KEY),
    redis.lindex(FEED_EVENT_QUEUE_KEY, -1),
    redis.get(FEED_EVENT_SUCCESS_COUNT_KEY),
    redis.get(FEED_EVENT_FAILURE_COUNT_KEY),
  ]);

  let oldestLagMs = 0;
  if (oldestRaw) {
    try {
      const parsed = JSON.parse(oldestRaw) as QueueItem;
      oldestLagMs = Math.max(0, Date.now() - Number(parsed.enqueuedAt ?? Date.now()));
    } catch {
      oldestLagMs = 0;
    }
  }

  const successCount = Number(successCountRaw ?? 0);
  const failureCount = Number(failureCountRaw ?? 0);
  const total = successCount + failureCount;
  return {
    queued: Number(queued),
    processing: Number(processing),
    oldestLagMs,
    successCount,
    failureCount,
    successRate: total > 0 ? successCount / total : 1,
    flushing: false,
    replaying: false,
  };
};
