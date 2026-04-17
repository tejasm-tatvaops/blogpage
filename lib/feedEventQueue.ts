import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { FeedEventModel } from "@/models/FeedEvent";
import { FailedFeedEventModel } from "@/models/FailedFeedEvent";
import type { FeedEventInput } from "@/lib/feedObservability";

type QueueItem = {
  id: string;
  payload: FeedEventInput;
  attempts: number;
  nextRetryAt: number;
  resolve: () => void;
  reject: (error: Error) => void;
};

type QueueState = {
  queue: QueueItem[];
  flushTimer: NodeJS.Timeout | null;
  replayTimer: NodeJS.Timeout | null;
  flushing: boolean;
  replaying: boolean;
  started: boolean;
  sequence: number;
};

const BATCH_INTERVAL_MS = 700;
const REPLAY_INTERVAL_MS = 15_000;
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 500;

const globalQueue = globalThis as typeof globalThis & {
  __tatvaopsFeedEventQueue?: QueueState;
};

const state: QueueState =
  globalQueue.__tatvaopsFeedEventQueue ??
  {
    queue: [],
    flushTimer: null,
    replayTimer: null,
    flushing: false,
    replaying: false,
    started: false,
    sequence: 0,
  };

globalQueue.__tatvaopsFeedEventQueue = state;

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

const backoffMs = (attempt: number): number => BASE_BACKOFF_MS * Math.max(1, 2 ** (attempt - 1));

const persistFailedBatch = async (items: QueueItem[], error: unknown): Promise<void> => {
  await connectToDatabase();
  const message = error instanceof Error ? error.message : String(error);
  await FailedFeedEventModel.insertMany(
    items.map((item) => ({
      payload: toFeedDoc(item.payload),
      attempts: item.attempts,
      last_error: message.slice(0, 1000),
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

const flushQueue = async (): Promise<void> => {
  if (state.flushing || state.queue.length === 0) return;
  state.flushing = true;
  try {
    const now = Date.now();
    const ready = state.queue.filter((item) => item.nextRetryAt <= now).slice(0, BATCH_SIZE);
    if (ready.length === 0) return;

    const readyIds = new Set(ready.map((item) => item.id));
    state.queue = state.queue.filter((item) => !readyIds.has(item.id));

    try {
      await processBatch(ready);
      ready.forEach((item) => item.resolve());
    } catch (error) {
      const retryable = ready.filter((item) => item.attempts + 1 < MAX_ATTEMPTS);
      const exhausted = ready.filter((item) => item.attempts + 1 >= MAX_ATTEMPTS);

      retryable.forEach((item) => {
        state.queue.push({
          ...item,
          attempts: item.attempts + 1,
          nextRetryAt: Date.now() + backoffMs(item.attempts + 1),
        });
      });

      if (exhausted.length > 0) {
        try {
          await persistFailedBatch(
            exhausted.map((item) => ({ ...item, attempts: item.attempts + 1 })),
            error,
          );
          exhausted.forEach((item) => item.resolve());
        } catch (persistError) {
          const err = persistError instanceof Error ? persistError : new Error(String(persistError));
          exhausted.forEach((item) => item.reject(err));
        }
      }

      logger.warn(
        {
          size: ready.length,
          retryable: retryable.length,
          exhausted: exhausted.length,
          error: error instanceof Error ? error.message : String(error),
        },
        "feed event batch failed",
      );
    }
  } finally {
    state.flushing = false;
  }
};

const replayFailedEvents = async (): Promise<void> => {
  if (state.replaying) return;
  state.replaying = true;
  try {
    await connectToDatabase();
    const pending = await FailedFeedEventModel.find({
      status: "pending",
      next_retry_at: { $lte: new Date() },
    })
      .sort({ created_at: 1 })
      .limit(BATCH_SIZE)
      .lean();
    if (pending.length === 0) return;

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
                next_retry_at: new Date(now + backoffMs((item.attempts ?? 0) + 1) + 10_000),
              },
              $inc: { attempts: 1 },
            },
          ),
        ),
      );
    }
  } finally {
    state.replaying = false;
  }
};

export const ensureFeedEventQueueStarted = (): void => {
  if (state.started) return;
  state.started = true;
  state.flushTimer = setInterval(() => {
    void flushQueue();
  }, BATCH_INTERVAL_MS);
  state.replayTimer = setInterval(() => {
    void replayFailedEvents();
  }, REPLAY_INTERVAL_MS);
};

export const enqueueFeedEvent = async (payload: FeedEventInput): Promise<void> => {
  ensureFeedEventQueueStarted();
  await new Promise<void>((resolve, reject) => {
    state.sequence += 1;
    state.queue.push({
      id: `${Date.now()}-${state.sequence}`,
      payload,
      attempts: 0,
      nextRetryAt: Date.now(),
      resolve,
      reject,
    });
  });
};

export const getFeedEventQueueHealth = (): {
  queued: number;
  flushing: boolean;
  replaying: boolean;
} => ({
  queued: state.queue.length,
  flushing: state.flushing,
  replaying: state.replaying,
});
