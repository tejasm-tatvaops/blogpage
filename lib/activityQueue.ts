import { randomUUID } from "crypto";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

export type Activity =
  | {
      id: string;
      type: "comment";
      postId: string;
      postType: "blog" | "forum";
      content?: string;
      authorName?: string;
      isAiGenerated?: boolean;
      dueAt: number;
      createdAt: number;
      attempts: number;
    }
  | {
      id: string;
      type: "reply";
      postId: string;
      postType: "blog" | "forum";
      commentId: string;
      content?: string;
      authorName?: string;
      isAiGenerated?: boolean;
      dueAt: number;
      createdAt: number;
      attempts: number;
    }
  | {
      id: string;
      type: "vote";
      postId: string;
      postType: "blog" | "forum";
      direction?: "up" | "down";
      dueAt: number;
      createdAt: number;
      attempts: number;
    };

type QueueState = {
  queue: Activity[];
  perPostCommentCounts: Map<string, number>;
};

const MAX_QUEUE_SIZE = 2_000;
const MAX_COMMENTS_PER_POST_IN_QUEUE = 20;
const ACTIVITY_QUEUE_KEY = "queue:activity:zset";
const ACTIVITY_POST_COUNTS_KEY = "queue:activity:post_counts";

const globalState = globalThis as typeof globalThis & {
  __tatvaopsActivityQueue?: QueueState;
};

const state: QueueState =
  globalState.__tatvaopsActivityQueue ??
  {
    queue: [],
    perPostCommentCounts: new Map<string, number>(),
  };

globalState.__tatvaopsActivityQueue = state;

const postKey = (postType: "blog" | "forum", postId: string): string => `${postType}:${postId}`;

const toActivity = (
  input: Omit<Activity, "id" | "createdAt" | "attempts"> & { dueAt?: number },
): Activity => {
  const now = Date.now();
  return {
    ...input,
    id: randomUUID(),
    createdAt: now,
    dueAt: input.dueAt ?? now,
    attempts: 0,
  } as Activity;
};

const shouldCountAgainstPerPostLimit = (activity: Activity): boolean =>
  activity.type === "comment" || activity.type === "reply";

const serializeActivity = (activity: Activity): string => JSON.stringify(activity);
const deserializeActivity = (raw: string): Activity | null => {
  try {
    return JSON.parse(raw) as Activity;
  } catch {
    return null;
  }
};

export const enqueueActivity = async (
  input: Omit<Activity, "id" | "createdAt" | "attempts"> & { dueAt?: number },
): Promise<boolean> => {
  const activity = toActivity(input);
  const redis = getRedisClient();

  if (redis && redis.status === "ready") {
    try {
      const result = await redis.eval(
        `
          local countsKey = KEYS[1]
          local queueKey = KEYS[2]
          local postKey = ARGV[1]
          local limit = tonumber(ARGV[2])
          local score = tonumber(ARGV[3])
          local member = ARGV[4]
          local shouldCount = ARGV[5]

          if shouldCount == "1" then
            local current = tonumber(redis.call("HGET", countsKey, postKey) or "0")
            if current >= limit then
              return 0
            end
            redis.call("HINCRBY", countsKey, postKey, 1)
          end

          redis.call("ZADD", queueKey, score, member)
          return 1
        `,
        2,
        ACTIVITY_POST_COUNTS_KEY,
        ACTIVITY_QUEUE_KEY,
        postKey(activity.postType, activity.postId),
        String(MAX_COMMENTS_PER_POST_IN_QUEUE),
        String(activity.dueAt),
        serializeActivity(activity),
        shouldCountAgainstPerPostLimit(activity) ? "1" : "0",
      );
      return Number(result) === 1;
    } catch (error) {
      logger.warn({ error }, "Redis enqueue failed; using in-memory activity queue fallback");
    }
  }

  if (state.queue.length >= MAX_QUEUE_SIZE) return false;
  if (shouldCountAgainstPerPostLimit(activity)) {
    const key = postKey(activity.postType, activity.postId);
    const count = state.perPostCommentCounts.get(key) ?? 0;
    if (count >= MAX_COMMENTS_PER_POST_IN_QUEUE) return false;
    state.perPostCommentCounts.set(key, count + 1);
  }

  state.queue.push(activity);
  state.queue.sort((a, b) => a.dueAt - b.dueAt);
  return true;
};

export const enqueueActivities = async (
  inputs: Array<Omit<Activity, "id" | "createdAt" | "attempts"> & { dueAt?: number }>,
): Promise<number> => {
  let accepted = 0;
  for (const input of inputs) {
    if (await enqueueActivity(input)) accepted += 1;
  }
  return accepted;
};

export const dequeueReadyActivities = async (maxCount: number): Promise<Activity[]> => {
  if (maxCount <= 0) return [];
  const redis = getRedisClient();

  if (redis && redis.status === "ready") {
    try {
      const raw = (await redis.eval(
        `
          local countsKey = KEYS[2]
          local queueKey = KEYS[1]
          local maxScore = tonumber(ARGV[1])
          local take = tonumber(ARGV[2])
          local items = redis.call("ZRANGEBYSCORE", queueKey, "-inf", maxScore, "LIMIT", 0, take)
          if #items > 0 then
            redis.call("ZREM", queueKey, unpack(items))
            for i = 1, #items do
              local ok, decoded = pcall(cjson.decode, items[i])
              if ok and decoded and decoded.type and decoded.postType and decoded.postId then
                if decoded.type == "comment" or decoded.type == "reply" then
                  local counterKey = tostring(decoded.postType) .. ":" .. tostring(decoded.postId)
                  local next = redis.call("HINCRBY", countsKey, counterKey, -1)
                  if next <= 0 then
                    redis.call("HDEL", countsKey, counterKey)
                  end
                end
              end
            end
          end
          return items
        `,
        2,
        ACTIVITY_QUEUE_KEY,
        ACTIVITY_POST_COUNTS_KEY,
        String(Date.now()),
        String(maxCount),
      )) as string[];
      if (raw.length === 0) return [];
      const parsed = raw
        .map((entry) => deserializeActivity(entry))
        .filter((entry): entry is Activity => Boolean(entry));

      return parsed;
    } catch (error) {
      logger.warn({ error }, "Redis dequeue failed; using in-memory activity queue fallback");
    }
  }

  const now = Date.now();
  const picked: Activity[] = [];
  const remaining: Activity[] = [];

  for (const activity of state.queue) {
    if (picked.length < maxCount && activity.dueAt <= now) {
      picked.push(activity);
      if (activity.type === "comment" || activity.type === "reply") {
        const key = postKey(activity.postType, activity.postId);
        const current = state.perPostCommentCounts.get(key) ?? 0;
        if (current <= 1) state.perPostCommentCounts.delete(key);
        else state.perPostCommentCounts.set(key, current - 1);
      }
    } else {
      remaining.push(activity);
    }
  }

  state.queue = remaining;
  return picked;
};

export const requeueActivity = async (activity: Activity, delayMs: number): Promise<void> => {
  await enqueueActivity({
    ...activity,
    dueAt: Date.now() + Math.max(500, delayMs),
  });
};

export const getActivityQueueStats = async (): Promise<{
  total: number;
  ready: number;
  scheduled: number;
}> => {
  const redis = getRedisClient();
  if (redis && redis.status === "ready") {
    try {
      const [total, ready] = await Promise.all([
        redis.zcard(ACTIVITY_QUEUE_KEY),
        redis.zcount(ACTIVITY_QUEUE_KEY, "-inf", Date.now()),
      ]);
      return {
        total: Number(total),
        ready: Number(ready),
        scheduled: Number(total) - Number(ready),
      };
    } catch (error) {
      logger.warn({ error }, "Redis stats failed; using in-memory activity queue stats");
    }
  }

  const now = Date.now();
  const ready = state.queue.filter((item) => item.dueAt <= now).length;
  return {
    total: state.queue.length,
    ready,
    scheduled: state.queue.length - ready,
  };
};

export const clearActivityQueue = async (): Promise<void> => {
  const redis = getRedisClient();
  if (redis && redis.status === "ready") {
    try {
      await redis.del(ACTIVITY_QUEUE_KEY, ACTIVITY_POST_COUNTS_KEY);
      return;
    } catch (error) {
      logger.warn({ error }, "Redis clear failed; clearing in-memory activity queue");
    }
  }
  state.queue = [];
  state.perPostCommentCounts.clear();
};
