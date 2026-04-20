import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { BlogModel } from "@/models/Blog";
import { CommentModel } from "@/models/Comment";
import { ForumPostModel } from "@/models/ForumPost";
import { ViewEventModel } from "@/models/ViewEvent";
import { ForumViewEventModel } from "@/models/ForumViewEvent";
import { BlogLikeModel } from "@/models/BlogLike";
import { ForumVoteModel } from "@/models/ForumVote";
import { CounterDriftEventModel } from "@/models/CounterDriftEvent";
import { recordLatency } from "@/lib/perfMetrics";
import { ReputationEventModel } from "@/models/ReputationEvent";
import { UserProfileModel, getReputationTier } from "@/models/UserProfile";

type ReconciliationSummary = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  entitiesScanned: number;
  correctionsMade: number;
  updated: number;
  smallDrifts: number;
  largeDrifts: number;
  stageTimingsMs: Record<string, number>;
};

type ReconciliationState = {
  running: boolean;
  started: boolean;
  timer: NodeJS.Timeout | null;
  lastRunAt: number;
  lastSummary: ReconciliationSummary | null;
};

const RECONCILIATION_INTERVAL_MS = 4 * 60 * 1000;
const MIN_GAP_MS = 2 * 60 * 1000;
const SMALL_DRIFT_THRESHOLD = 2;
const LARGE_DRIFT_THRESHOLD = 20;

const globalState = globalThis as typeof globalThis & {
  __tatvaopsReconciliationState?: ReconciliationState;
};

const state: ReconciliationState =
  globalState.__tatvaopsReconciliationState ??
  {
    running: false,
    started: false,
    timer: null,
    lastRunAt: 0,
    lastSummary: null,
  };

globalState.__tatvaopsReconciliationState = state;

const driftSeverity = (drift: number): "small" | "large" =>
  Math.abs(drift) >= LARGE_DRIFT_THRESHOLD ? "large" : "small";

const logDrift = async (input: {
  metric: string;
  entityType: string;
  entityId: string;
  actual: number;
  expected: number;
}): Promise<"small" | "large"> => {
  const drift = input.expected - input.actual;
  const severity = driftSeverity(drift);
  await CounterDriftEventModel.create({
    metric: input.metric,
    entity_type: input.entityType,
    entity_id: input.entityId,
    expected_value: input.expected,
    actual_value: input.actual,
    drift,
    severity,
  });
  if (severity === "large") {
    logger.warn({ ...input, drift }, "large counter drift corrected");
  }
  return severity;
};

const reconcileForumCommentCounts = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await CommentModel.aggregate([
    { $match: { deleted_at: null } },
    { $group: { _id: "$post_id", total: { $sum: 1 } } },
  ]);
  const map = new Map<string, number>(aggregates.map((row) => [String(row._id), Number(row.total ?? 0)]));
  const forums = await ForumPostModel.find({ deleted_at: null }).select("_id comment_count").lean();

  const scanned = forums.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const forum of forums) {
    const id = forum._id.toString();
    const expected = map.get(id) ?? 0;
    const actual = Number(forum.comment_count ?? 0);
    const drift = expected - actual;
    if (Math.abs(drift) <= SMALL_DRIFT_THRESHOLD) continue;
    await ForumPostModel.updateOne({ _id: forum._id }, { $set: { comment_count: expected } });
    const severity = await logDrift({
      metric: "forum.comment_count",
      entityType: "forum_post",
      entityId: id,
      actual,
      expected,
    });
    updated += 1;
    if (severity === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

const reconcileBlogVoteCounts = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await BlogLikeModel.aggregate([
    {
      $group: {
        _id: "$blog_slug",
        up: { $sum: { $cond: [{ $eq: ["$direction", "up"] }, 1, 0] } },
        down: { $sum: { $cond: [{ $eq: ["$direction", "down"] }, 1, 0] } },
      },
    },
  ]);
  const aggMap = new Map<string, { up: number; down: number }>(
    aggregates.map((row) => [String(row._id), { up: Number(row.up ?? 0), down: Number(row.down ?? 0) }]),
  );
  const blogs = await BlogModel.find({ deleted_at: null }).select("slug upvote_count downvote_count").lean();

  const scanned = blogs.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const blog of blogs) {
    const slug = String(blog.slug);
    const expected = aggMap.get(slug) ?? { up: 0, down: 0 };
    const actualUp = Number(blog.upvote_count ?? 0);
    const actualDown = Number(blog.downvote_count ?? 0);
    const driftUp = expected.up - actualUp;
    const driftDown = expected.down - actualDown;
    if (Math.abs(driftUp) <= SMALL_DRIFT_THRESHOLD && Math.abs(driftDown) <= SMALL_DRIFT_THRESHOLD) continue;
    await BlogModel.updateOne(
      { _id: blog._id },
      { $set: { upvote_count: expected.up, downvote_count: expected.down } },
    );
    const sevUp = await logDrift({
      metric: "blog.upvote_count",
      entityType: "blog_post",
      entityId: slug,
      actual: actualUp,
      expected: expected.up,
    });
    const sevDown = await logDrift({
      metric: "blog.downvote_count",
      entityType: "blog_post",
      entityId: slug,
      actual: actualDown,
      expected: expected.down,
    });
    updated += 1;
    if (sevUp === "large" || sevDown === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

const reconcileForumVoteCounts = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await ForumVoteModel.aggregate([
    {
      $group: {
        _id: "$post_id",
        up: { $sum: { $cond: [{ $eq: ["$direction", "up"] }, 1, 0] } },
        down: { $sum: { $cond: [{ $eq: ["$direction", "down"] }, 1, 0] } },
      },
    },
  ]);
  const aggMap = new Map<string, { up: number; down: number }>(
    aggregates.map((row) => [String(row._id), { up: Number(row.up ?? 0), down: Number(row.down ?? 0) }]),
  );
  const forums = await ForumPostModel.find({ deleted_at: null }).select("_id upvote_count downvote_count").lean();

  const scanned = forums.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const forum of forums) {
    const postId = forum._id.toString();
    const expected = aggMap.get(postId) ?? { up: 0, down: 0 };
    const actualUp = Number(forum.upvote_count ?? 0);
    const actualDown = Number(forum.downvote_count ?? 0);
    const driftUp = expected.up - actualUp;
    const driftDown = expected.down - actualDown;
    if (Math.abs(driftUp) <= SMALL_DRIFT_THRESHOLD && Math.abs(driftDown) <= SMALL_DRIFT_THRESHOLD) continue;
    await ForumPostModel.updateOne(
      { _id: forum._id },
      { $set: { upvote_count: expected.up, downvote_count: expected.down } },
    );
    const sevUp = await logDrift({
      metric: "forum.upvote_count",
      entityType: "forum_post",
      entityId: postId,
      actual: actualUp,
      expected: expected.up,
    });
    const sevDown = await logDrift({
      metric: "forum.downvote_count",
      entityType: "forum_post",
      entityId: postId,
      actual: actualDown,
      expected: expected.down,
    });
    updated += 1;
    if (sevUp === "large" || sevDown === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

const reconcileBlogViewCounts = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await ViewEventModel.aggregate([
    { $group: { _id: "$slug", total: { $sum: 1 } } },
  ]);
  const map = new Map<string, number>(aggregates.map((row) => [String(row._id), Number(row.total ?? 0)]));
  const blogs = await BlogModel.find({ deleted_at: null }).select("slug view_count").lean();

  const scanned = blogs.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const blog of blogs) {
    const slug = String(blog.slug);
    const expected = map.get(slug) ?? 0;
    const actual = Number(blog.view_count ?? 0);
    const drift = expected - actual;
    if (Math.abs(drift) <= SMALL_DRIFT_THRESHOLD) continue;
    await BlogModel.updateOne({ _id: blog._id }, { $set: { view_count: expected } });
    const severity = await logDrift({
      metric: "blog.view_count",
      entityType: "blog_post",
      entityId: slug,
      actual,
      expected,
    });
    updated += 1;
    if (severity === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

const reconcileForumViewCounts = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await ForumViewEventModel.aggregate([
    { $group: { _id: "$post_id", total: { $sum: 1 } } },
  ]);
  const map = new Map<string, number>(aggregates.map((row) => [String(row._id), Number(row.total ?? 0)]));
  const forums = await ForumPostModel.find({ deleted_at: null }).select("_id view_count").lean();

  const scanned = forums.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const forum of forums) {
    const id = forum._id.toString();
    const expected = map.get(id);
    if (typeof expected !== "number") continue;
    const actual = Number(forum.view_count ?? 0);
    const drift = expected - actual;
    if (Math.abs(drift) <= SMALL_DRIFT_THRESHOLD) continue;
    await ForumPostModel.updateOne({ _id: forum._id }, { $set: { view_count: expected } });
    const severity = await logDrift({
      metric: "forum.view_count",
      entityType: "forum_post",
      entityId: id,
      actual,
      expected,
    });
    updated += 1;
    if (severity === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

const reconcileReputationScores = async (): Promise<{ scanned: number; updated: number; small: number; large: number }> => {
  const aggregates = await ReputationEventModel.aggregate([
    { $group: { _id: "$identity_key", total: { $sum: "$awarded_points" } } },
  ]);
  const eventMap = new Map<string, number>(
    aggregates.map((row) => [String(row._id), Math.max(0, Number(row.total ?? 0))]),
  );
  const profiles = await UserProfileModel.find({}).select("identity_key reputation_score").lean();

  const scanned = profiles.length;
  let updated = 0;
  let small = 0;
  let large = 0;
  for (const profile of profiles) {
    const identityKey = String(profile.identity_key);
    const expected = eventMap.get(identityKey) ?? 0;
    const actual = Number(profile.reputation_score ?? 0);
    const drift = expected - actual;
    if (Math.abs(drift) <= SMALL_DRIFT_THRESHOLD) continue;
    await UserProfileModel.updateOne(
      { _id: profile._id },
      { $set: { reputation_score: expected, reputation_tier: getReputationTier(expected) } },
    );
    const severity = await logDrift({
      metric: "user_profile.reputation_score",
      entityType: "user_profile",
      entityId: identityKey,
      actual,
      expected,
    });
    updated += 1;
    if (severity === "large") large += 1;
    else small += 1;
  }
  return { scanned, updated, small, large };
};

export const runReconciliationNow = async (): Promise<ReconciliationSummary> => {
  const now = Date.now();
  if (state.running || now - state.lastRunAt < MIN_GAP_MS) {
    return (
      state.lastSummary ?? {
        startedAt: new Date(now).toISOString(),
        finishedAt: new Date(now).toISOString(),
        durationMs: 0,
        entitiesScanned: 0,
        correctionsMade: 0,
        updated: 0,
        smallDrifts: 0,
        largeDrifts: 0,
        stageTimingsMs: {},
      }
    );
  }

  state.running = true;
  state.lastRunAt = now;
  const startedAt = new Date().toISOString();
  let updated = 0;
  let entitiesScanned = 0;
  let smallDrifts = 0;
  let largeDrifts = 0;
  const stageTimingsMs: Record<string, number> = {};

  try {
    await connectToDatabase();
    const jobs: Array<[string, () => Promise<{ scanned: number; updated: number; small: number; large: number }>]> = [
      ["forum_comment_count", reconcileForumCommentCounts],
      ["blog_vote_count", reconcileBlogVoteCounts],
      ["forum_vote_count", reconcileForumVoteCounts],
      ["blog_view_count", reconcileBlogViewCounts],
      ["forum_view_count", reconcileForumViewCounts],
      ["reputation_score", reconcileReputationScores],
    ];
    for (const [jobName, job] of jobs) {
      try {
        const stageStart = Date.now();
        const result = await job();
        const stageMs = Date.now() - stageStart;
        stageTimingsMs[jobName] = stageMs;
        recordLatency(`reconciliation.stage.${jobName}`, stageMs);
        entitiesScanned += result.scanned;
        updated += result.updated;
        smallDrifts += result.small;
        largeDrifts += result.large;
      } catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : String(error) }, "reconciliation sub-job failed");
      }
    }
  } finally {
    const finishedAt = new Date().toISOString();
    const summary: ReconciliationSummary = {
      startedAt,
      finishedAt,
      durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
      entitiesScanned,
      correctionsMade: updated,
      updated,
      smallDrifts,
      largeDrifts,
      stageTimingsMs,
    };
    recordLatency("reconciliation.run.total", summary.durationMs);
    state.lastSummary = summary;
    state.running = false;
  }

  return state.lastSummary!;
};

export const startReconciliationWorker = (): void => {
  if (state.started) return;
  state.started = true;
  state.timer = setInterval(() => {
    void runReconciliationNow();
  }, RECONCILIATION_INTERVAL_MS);
};

export const getReconciliationHealth = (): {
  running: boolean;
  lastRunAt: string | null;
  lastSummary: ReconciliationSummary | null;
} => ({
  running: state.running,
  lastRunAt: state.lastRunAt ? new Date(state.lastRunAt).toISOString() : null,
  lastSummary: state.lastSummary,
});
