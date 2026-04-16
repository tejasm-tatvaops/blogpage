import { randomUUID } from "crypto";

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

export const enqueueActivity = (
  input: Omit<Activity, "id" | "createdAt" | "attempts"> & { dueAt?: number },
): boolean => {
  if (state.queue.length >= MAX_QUEUE_SIZE) return false;
  const activity = toActivity(input);

  if (activity.type === "comment" || activity.type === "reply") {
    const key = postKey(activity.postType, activity.postId);
    const count = state.perPostCommentCounts.get(key) ?? 0;
    if (count >= MAX_COMMENTS_PER_POST_IN_QUEUE) return false;
    state.perPostCommentCounts.set(key, count + 1);
  }

  state.queue.push(activity);
  state.queue.sort((a, b) => a.dueAt - b.dueAt);
  return true;
};

export const enqueueActivities = (
  inputs: Array<Omit<Activity, "id" | "createdAt" | "attempts"> & { dueAt?: number }>,
): number => {
  let accepted = 0;
  for (const input of inputs) {
    if (enqueueActivity(input)) accepted += 1;
  }
  return accepted;
};

export const dequeueReadyActivities = (maxCount: number): Activity[] => {
  if (maxCount <= 0) return [];
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

export const requeueActivity = (activity: Activity, delayMs: number): void => {
  enqueueActivity({
    ...activity,
    dueAt: Date.now() + Math.max(500, delayMs),
  });
};

export const getActivityQueueStats = () => {
  const now = Date.now();
  const ready = state.queue.filter((item) => item.dueAt <= now).length;
  return {
    total: state.queue.length,
    ready,
    scheduled: state.queue.length - ready,
  };
};

export const clearActivityQueue = (): void => {
  state.queue = [];
  state.perPostCommentCounts.clear();
};
