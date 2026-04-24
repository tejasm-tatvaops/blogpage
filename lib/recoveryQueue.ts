import { logger } from "@/lib/logger";

type RecoveryTask = {
  id: string;
  flow: string;
  run: () => Promise<void>;
  attempts: number;
  maxAttempts: number;
};

const queue: RecoveryTask[] = [];
let draining = false;

const nextDelayMs = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 30_000);

async function drainQueue() {
  if (draining) return;
  draining = true;
  while (queue.length > 0) {
    const task = queue.shift();
    if (!task) continue;

    try {
      logger.info({ flow: task.flow, taskId: task.id, attempt: task.attempts }, "Recovery task started");
      await task.run();
      logger.info({ flow: task.flow, taskId: task.id, attempt: task.attempts }, "Recovery task completed");
    } catch (error) {
      if (task.attempts >= task.maxAttempts) {
        logger.error(
          { error, flow: task.flow, taskId: task.id, attempts: task.attempts },
          "Recovery task exhausted retries",
        );
        continue;
      }
      const nextAttempt = task.attempts + 1;
      const delayMs = nextDelayMs(nextAttempt);
      logger.warn(
        { error, flow: task.flow, taskId: task.id, attempt: task.attempts, retryInMs: delayMs },
        "Recovery task failed; scheduling retry",
      );
      setTimeout(() => {
        queue.push({ ...task, attempts: nextAttempt });
        void drainQueue();
      }, delayMs);
    }
  }
  draining = false;
}

export function enqueueRecoveryTask(task: {
  id: string;
  flow: string;
  run: () => Promise<void>;
  maxAttempts?: number;
}) {
  queue.push({
    id: task.id,
    flow: task.flow,
    run: task.run,
    attempts: 1,
    maxAttempts: Math.max(1, task.maxAttempts ?? 3),
  });
  logger.info({ flow: task.flow, taskId: task.id, queueDepth: queue.length }, "Recovery task enqueued");
  void drainQueue();
}
