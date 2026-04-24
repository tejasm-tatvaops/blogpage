import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FeedEventModel } from "@/models/FeedEvent";
import { FailedFeedEventModel } from "@/models/FailedFeedEvent";
import { CounterDriftEventModel } from "@/models/CounterDriftEvent";
import { getFeedObservabilityHealth } from "@/lib/feedObservability";
import { getReconciliationHealth, startReconciliationWorker } from "@/lib/reconciliationService";
import { getLatencyStats, recordLatency } from "@/lib/perfMetrics";
import { getAskAiQualitySnapshot } from "@/lib/askAiQualityMetrics";
import { getRecommendationQualitySnapshot } from "@/lib/recommendationQualityMetrics";

const driftEntityLabel = (value: string): "Blog" | "Forum" | "Other" => {
  if (value.startsWith("blog")) return "Blog";
  if (value.startsWith("forum")) return "Forum";
  return "Other";
};

export async function GET() {
  const requestStart = Date.now();
  const allowed = await requireAdminApiAccess();
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  startReconciliationWorker();

  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60_000);
  const fiveMinutesAgo = new Date(now - 5 * 60_000);
  const oneHourAgo = new Date(now - 60 * 60_000);

  const [events1m, dwell1m, skip5m, total5m, failedPending, failedHighAttempts, recentDrifts, recommendationAgg, recommendationPositionRows] = await Promise.all([
    FeedEventModel.countDocuments({ created_at: { $gte: oneMinuteAgo } }),
    FeedEventModel.countDocuments({ event_type: "dwell_time", created_at: { $gte: oneMinuteAgo } }),
    FeedEventModel.countDocuments({ event_type: "skip", created_at: { $gte: fiveMinutesAgo } }),
    FeedEventModel.countDocuments({ created_at: { $gte: fiveMinutesAgo } }),
    FailedFeedEventModel.countDocuments({ status: "pending" }),
    FailedFeedEventModel.countDocuments({ status: "pending", attempts: { $gte: 3 } }),
    CounterDriftEventModel.find({ created_at: { $gte: oneHourAgo } }).sort({ created_at: -1 }).limit(15).lean(),
    FeedEventModel.aggregate<{ _id: null; impressions: number; clicks: number }>([
      { $match: { created_at: { $gte: oneHourAgo }, event_type: { $in: ["recommendation_impression", "recommendation_click"] } } },
      {
        $group: {
          _id: null,
          impressions: { $sum: { $cond: [{ $eq: ["$event_type", "recommendation_impression"] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ["$event_type", "recommendation_click"] }, 1, 0] } },
        },
      },
    ]),
    FeedEventModel.aggregate<{ _id: number; impressions: number; clicks: number }>([
      {
        $match: {
          created_at: { $gte: oneHourAgo },
          event_type: { $in: ["recommendation_impression", "recommendation_click"] },
          position: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$position",
          impressions: { $sum: { $cond: [{ $eq: ["$event_type", "recommendation_impression"] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ["$event_type", "recommendation_click"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]),
  ]);

  const queue = getFeedObservabilityHealth().queue;
  const reconciliation = getReconciliationHealth();
  const eventRatePerSec = events1m / 60;
  const dwellRatePerSec = dwell1m / 60;
  const skipRate = total5m > 0 ? skip5m / total5m : 0;
  const largeDriftRecent = recentDrifts.filter((item) => item.severity === "large").length;
  const recommendationImpressions = Number(recommendationAgg[0]?.impressions ?? 0);
  const recommendationClicks = Number(recommendationAgg[0]?.clicks ?? 0);
  const recommendationCtr = recommendationImpressions > 0 ? recommendationClicks / recommendationImpressions : 0;
  const askAiQuality = getAskAiQualitySnapshot();
  const recommendationQuality = getRecommendationQualitySnapshot();

  const healthStatus =
    failedHighAttempts >= 10 || largeDriftRecent >= 4 || failedPending >= 150
      ? "Needs attention"
      : failedPending >= 40 || largeDriftRecent >= 1 || queue.queued >= 80
        ? "Degraded"
        : "Healthy";

  const payload = {
    generated_at: new Date().toISOString(),
    status: healthStatus,
    queue: {
      depth: queue.queued,
      flush_status: queue.flushing ? "flushing" : "idle",
      replay_backlog_size: failedPending,
      failed_event_count: failedHighAttempts,
      replaying: queue.replaying,
    },
    reconciliation: reconciliation.lastSummary
      ? {
          running: reconciliation.running,
          last_run_at: reconciliation.lastRunAt,
          duration_ms: reconciliation.lastSummary.durationMs,
          entities_scanned: reconciliation.lastSummary.entitiesScanned,
          corrections_made: reconciliation.lastSummary.correctionsMade,
          small_drifts: reconciliation.lastSummary.smallDrifts,
          large_drifts: reconciliation.lastSummary.largeDrifts,
        }
      : {
          running: reconciliation.running,
          last_run_at: reconciliation.lastRunAt,
          duration_ms: 0,
          entities_scanned: 0,
          corrections_made: 0,
          small_drifts: 0,
          large_drifts: 0,
        },
    live_signals: {
      events_per_sec: eventRatePerSec,
      dwell_events_per_sec: dwellRatePerSec,
      skip_rate: skipRate,
      window_seconds: 60,
      skip_window_seconds: 300,
    },
    recommendations: {
      impressions_last_hour: recommendationImpressions,
      clicks_last_hour: recommendationClicks,
      ctr_last_hour: recommendationCtr,
      position_performance: recommendationPositionRows.map((row) => ({
        position: Number(row._id),
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        ctr: Number(row.impressions > 0 ? row.clicks / row.impressions : 0),
      })),
      quality: recommendationQuality,
    },
    ask_ai: askAiQuality,
    latency: {
      feed_request_total_ms: getLatencyStats("feed.request.total"),
      feed_cache_hit_total_ms: getLatencyStats("feed.request.cache_hit_total"),
      feed_cache_miss_total_ms: getLatencyStats("feed.request.cache_miss_total"),
      feed_stage_ms: {
        cache_read: getLatencyStats("feed.stage.cache_read"),
        persona_fetch: getLatencyStats("feed.stage.persona_fetch"),
        candidate_generation: getLatencyStats("feed.stage.candidate_generation"),
        scoring: getLatencyStats("feed.stage.scoring"),
        build_feed_total: getLatencyStats("feed.stage.build_feed_total"),
        cache_write: getLatencyStats("feed.stage.cache_write"),
        event_enqueue: getLatencyStats("feed.stage.event_enqueue"),
      },
      reconciliation_total_ms: getLatencyStats("reconciliation.run.total"),
      reconciliation_stage_ms: {
        forum_comment_count: getLatencyStats("reconciliation.stage.forum_comment_count"),
        blog_vote_count: getLatencyStats("reconciliation.stage.blog_vote_count"),
        forum_vote_count: getLatencyStats("reconciliation.stage.forum_vote_count"),
        blog_view_count: getLatencyStats("reconciliation.stage.blog_view_count"),
        forum_view_count: getLatencyStats("reconciliation.stage.forum_view_count"),
      },
      observability_api_ms: getLatencyStats("admin.observability.api"),
    },
    drift_events: recentDrifts.map((event) => ({
      id: event._id.toString(),
      entity: driftEntityLabel(event.entity_type),
      metric: event.metric,
      expected: Number(event.expected_value ?? 0),
      actual: Number(event.actual_value ?? 0),
      drift: Number(event.drift ?? 0),
      drift_percent:
        Math.abs(Number(event.actual_value ?? 0)) > 0
          ? (Number(event.drift ?? 0) / Math.abs(Number(event.actual_value ?? 0))) * 100
          : Number(event.expected_value ?? 0) > 0
            ? 100
            : 0,
      severity: event.severity,
      created_at: event.created_at?.toISOString?.() ?? new Date().toISOString(),
      entity_id: event.entity_id,
    })),
  };
  recordLatency("admin.observability.api", Date.now() - requestStart);
  return NextResponse.json(payload);
}
