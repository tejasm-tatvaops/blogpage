import { BlogModel } from "@/models/Blog";
import { CommentModel } from "@/models/Comment";
import { addComment } from "./commentService";
import { voteForumPost, incrementForumCommentCount, getForumPosts, setForumPostTrending } from "./forumService";
import { getAllPosts } from "./blogService";
import {
  dequeueReadyActivities,
  enqueueActivities,
  getActivityQueueStats,
  requeueActivity,
  type Activity,
} from "./activityQueue";
import { logger } from "./logger";
import { preGenerateActivityDrafts } from "./autopopulateService";
import { getSystemToggles, setSystemToggles } from "./systemToggles";
import { maybeApplyTypos, pickPersona } from "./personas";

type RunnerState = {
  started: boolean;
  tickTimer: NodeJS.Timeout | null;
  inFlight: boolean;
  lastRefillAt: number;
  minuteBucketStart: number;
  minuteActions: number;
  postEngagement: Map<string, number[]>;
  inSilenceUntil: number;
};

const globalRunner = globalThis as typeof globalThis & {
  __tatvaopsActivityRunner?: RunnerState;
};

const state: RunnerState =
  globalRunner.__tatvaopsActivityRunner ??
  {
    started: false,
    tickTimer: null,
    inFlight: false,
    lastRefillAt: 0,
    minuteBucketStart: Date.now(),
    minuteActions: 0,
    postEngagement: new Map<string, number[]>(),
    inSilenceUntil: 0,
  };

globalRunner.__tatvaopsActivityRunner = state;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const actionsPerMinuteCap = (): number => {
  const hour = new Date().getHours();
  // More human-like daily activity curve.
  if (hour >= 7 && hour <= 10) return 5;
  if (hour >= 11 && hour <= 14) return 8;
  if (hour >= 15 && hour <= 18) return 10;
  if (hour >= 19 && hour <= 22) return 12;
  return 2;
};

const maxCommentsPerPost = 24;
const TRENDING_WINDOW_MS = 3 * 60 * 1000;
const TRENDING_THRESHOLD = 5;

const registerEngagement = async (activity: Activity): Promise<void> => {
  if (activity.postType !== "forum") return;
  const key = activity.postId;
  const now = Date.now();
  const existing = state.postEngagement.get(key) ?? [];
  const next = [...existing.filter((t) => now - t <= TRENDING_WINDOW_MS), now];
  state.postEngagement.set(key, next);
  if (next.length >= TRENDING_THRESHOLD) {
    await setForumPostTrending(activity.postId, true);
    if (Math.random() > 0.45) {
      requeueActivity(
        {
          type: "vote",
          postId: activity.postId,
          postType: "forum",
          direction: "up",
          id: "trend-boost",
          dueAt: 0,
          createdAt: 0,
          attempts: 0,
        },
        randInt(15_000, 30_000),
      );
    }
  }
};

const canExecuteCommentForPost = async (postId: string): Promise<boolean> => {
  const count = await CommentModel.countDocuments({ post_id: postId, deleted_at: null });
  return count < maxCommentsPerPost;
};

const executeActivity = async (activity: Activity): Promise<boolean> => {
  try {
    const persona = pickPersona();
    if (activity.type === "comment") {
      if (!(await canExecuteCommentForPost(activity.postId))) return true;
      const created = await addComment(activity.postId, {
        author_name: activity.authorName ?? "Site Engineer",
        content: maybeApplyTypos(
          activity.content ?? "Good thread. Curious how this compares with your latest site numbers.",
        ),
        parent_comment_id: null,
        is_ai_generated: activity.isAiGenerated ?? true,
        persona_name: persona.name,
      });
      if (activity.postType === "forum") {
        await incrementForumCommentCount(activity.postId);
      }

      if (Math.random() > 0.55) {
        requeueActivity(
          {
            type: "reply",
            postId: activity.postId,
            postType: activity.postType,
            commentId: created.id,
            content: "One practical way is to benchmark against the latest BOQ revision and vendor quotes.",
            authorName: "Planning Lead",
            isAiGenerated: true,
            id: "reply-seed",
            dueAt: 0,
            createdAt: 0,
            attempts: 0,
          },
          randInt(45_000, 140_000),
        );
      }
      await registerEngagement(activity);
      return true;
    }

    if (activity.type === "reply") {
      if (!(await canExecuteCommentForPost(activity.postId))) return true;
      await addComment(activity.postId, {
        author_name: activity.authorName ?? "Procurement Analyst",
        content: maybeApplyTypos(
          activity.content ?? "We saw similar variance and solved it by tightening quantity validation.",
        ),
        parent_comment_id: activity.commentId,
        is_ai_generated: activity.isAiGenerated ?? true,
        persona_name: persona.name,
      });
      if (activity.postType === "forum") {
        await incrementForumCommentCount(activity.postId);
      }
      await registerEngagement(activity);
      return true;
    }

    if (activity.postType === "forum") {
      const result = await voteForumPost(
        activity.postId,
        activity.direction ?? "up",
        `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      );
      if (result.ok) await registerEngagement(activity);
      return result.ok || result.reason === "already_voted";
    }

    const field = (activity.direction ?? "up") === "down" ? "downvote_count" : "upvote_count";
    const voteResult = await BlogModel.updateOne(
      { _id: activity.postId, deleted_at: null },
      { $inc: { [field]: 1 } },
    );
    return voteResult.modifiedCount > 0;
  } catch (error) {
    logger.warn(
      { type: activity.type, postId: activity.postId, error: error instanceof Error ? error.message : String(error) },
      "activity execution failed",
    );
    return false;
  }
};

const refillQueueIfNeeded = async (): Promise<void> => {
  const stats = getActivityQueueStats();
  const now = Date.now();
  if (stats.total > 30) return;
  if (now - state.lastRefillAt < 10 * 60 * 1000) return;

  const [blogs, forums] = await Promise.all([
    getAllPosts({ sort: "most_viewed", limit: 4 }),
    getForumPosts({ sort: "hot", page: 1, limit: 4 }),
  ]);
  const targets = [
    ...blogs.slice(0, 2).map((post) => ({
      postId: post.id,
      postType: "blog" as const,
      title: post.title,
      excerpt: post.excerpt,
    })),
    ...forums.posts.slice(0, 2).map((post) => ({
      postId: post.id,
      postType: "forum" as const,
      title: post.title,
      excerpt: post.excerpt,
    })),
  ];

  const drafted = await preGenerateActivityDrafts(targets);
  const accepted = enqueueActivities(
    drafted.map((item) => ({
      type: item.type,
      postId: item.postId,
      postType: item.postType,
      commentId: item.type === "reply" ? item.commentId : undefined,
      content: "content" in item ? item.content : undefined,
      authorName: "authorName" in item ? item.authorName : undefined,
      direction: item.type === "vote" ? item.direction : undefined,
      isAiGenerated:
        item.type === "comment" || item.type === "reply" ? item.isAiGenerated : undefined,
      dueAt: item.dueAt,
    })),
  );

  state.lastRefillAt = now;
  logger.info({ accepted, queue: getActivityQueueStats() }, "activity queue refilled");
};

const tick = async (): Promise<void> => {
  if (!getSystemToggles().liveActivityEnabled || state.inFlight) return;
  if (Date.now() < state.inSilenceUntil) return;
  state.inFlight = true;
  try {
    await refillQueueIfNeeded();
    const now = Date.now();
    if (now - state.minuteBucketStart >= 60_000) {
      state.minuteBucketStart = now;
      state.minuteActions = 0;
    }

    const cap = actionsPerMinuteCap();
    const remaining = Math.max(0, cap - state.minuteActions);
    if (remaining <= 0) return;

    const clusterBurst = Math.random() < 0.32;
    const batchSize = Math.min(remaining, clusterBurst ? randInt(2, 2) : 1);
    const activities = dequeueReadyActivities(batchSize);
    for (const activity of activities) {
      const ok = await executeActivity(activity);
      if (!ok && activity.attempts < 2) {
        requeueActivity({ ...activity, attempts: activity.attempts + 1 }, randInt(30_000, 80_000));
      } else if (ok) {
        state.minuteActions += 1;
      }
      await sleep(clusterBurst ? randInt(1_600, 4_200) : randInt(3_200, 10_000));
    }
    if (Math.random() < 0.38) {
      state.inSilenceUntil = Date.now() + randInt(60_000, 240_000);
    }
  } finally {
    state.inFlight = false;
  }
};

const scheduleNext = (): void => {
  if (!state.started) return;
  if (state.tickTimer) clearTimeout(state.tickTimer);
  const delay = randInt(30_000, 90_000);
  state.tickTimer = setTimeout(async () => {
    await tick();
    scheduleNext();
  }, delay);
};

export const ensureActivityRunnerStarted = (): void => {
  if (state.started) return;
  state.started = true;
  scheduleNext();
};

export const setLiveActivityEnabled = (enabled: boolean): { enabled: boolean; queue: ReturnType<typeof getActivityQueueStats> } => {
  ensureActivityRunnerStarted();
  const next = setSystemToggles({ liveActivityEnabled: enabled });
  return { enabled: next.liveActivityEnabled, queue: getActivityQueueStats() };
};

export const getLiveActivityStatus = (): {
  enabled: boolean;
  queue: ReturnType<typeof getActivityQueueStats>;
  actionsThisMinute: number;
} => ({
  enabled: getSystemToggles().liveActivityEnabled,
  queue: getActivityQueueStats(),
  actionsThisMinute: state.minuteActions,
});
