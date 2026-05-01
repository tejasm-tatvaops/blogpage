import { deleteCommentWithReversal } from "@/lib/domains/comment.domain";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";

type RecoveryFlow = "comment_delete_blog" | "comment_delete_forum";

type RecoveryTaskPayload = {
  postId: string;
  postSlug: string;
  postType: "blog" | "forum";
  identityKey: string;
  commentId: string;
};

type RecoveryTask = {
  id: string;
  flow: RecoveryFlow;
  payload: RecoveryTaskPayload;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
};

const RECOVERY_QUEUE_KEY = "queue:recovery:list";
const RECOVERY_PROCESSING_KEY = "queue:recovery:processing";

const executeRecoveryTask = async (task: RecoveryTask): Promise<void> => {
  if (task.flow === "comment_delete_blog" || task.flow === "comment_delete_forum") {
    await deleteCommentWithReversal(task.payload);
    return;
  }
  throw new Error(`Unsupported recovery flow: ${task.flow}`);
};

export const enqueueRecoveryTask = async (task: {
  id: string;
  flow: RecoveryFlow;
  payload: RecoveryTaskPayload;
  maxAttempts?: number;
}): Promise<void> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    logger.warn({ flow: task.flow, taskId: task.id }, "Recovery queue unavailable; task dropped");
    return;
  }

  const payload: RecoveryTask = {
    id: task.id,
    flow: task.flow,
    payload: task.payload,
    attempts: 1,
    maxAttempts: Math.max(1, task.maxAttempts ?? 3),
    createdAt: Date.now(),
  };
  await redis.lpush(RECOVERY_QUEUE_KEY, JSON.stringify(payload));
  logger.info({ flow: payload.flow, taskId: payload.id }, "Recovery task enqueued");
};

export const drainRecoveryQueue = async (batchSize = 20): Promise<{
  processed: number;
  retried: number;
  exhausted: number;
  remaining: number;
}> => {
  const redis = getRedisClient();
  if (!redis || redis.status !== "ready") {
    return { processed: 0, retried: 0, exhausted: 0, remaining: 0 };
  }

  let processed = 0;
  let retried = 0;
  let exhausted = 0;

  for (let i = 0; i < batchSize; i += 1) {
    const raw = await redis.rpoplpush(RECOVERY_QUEUE_KEY, RECOVERY_PROCESSING_KEY);
    if (!raw) break;

    let task: RecoveryTask | null = null;
    try {
      task = JSON.parse(raw) as RecoveryTask;
      await executeRecoveryTask(task);
      processed += 1;
    } catch (error) {
      if (task && task.attempts < task.maxAttempts) {
        const retryTask: RecoveryTask = { ...task, attempts: task.attempts + 1 };
        await redis.lpush(RECOVERY_QUEUE_KEY, JSON.stringify(retryTask));
        retried += 1;
        logger.warn(
          { flow: task.flow, taskId: task.id, attempts: retryTask.attempts, error },
          "Recovery task failed; requeued",
        );
      } else {
        exhausted += 1;
        logger.error({ task, error }, "Recovery task exhausted retries");
      }
    } finally {
      await redis.lrem(RECOVERY_PROCESSING_KEY, 1, raw);
    }
  }

  const remaining = Number(await redis.llen(RECOVERY_QUEUE_KEY));
  return { processed, retried, exhausted, remaining };
};
