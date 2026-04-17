import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { connectToDatabase } from "@/lib/mongodb";
import { FeedEventModel } from "@/models/FeedEvent";
import { FailedFeedEventModel } from "@/models/FailedFeedEvent";
import { CounterDriftEventModel } from "@/models/CounterDriftEvent";
import { getFeedObservabilityHealth } from "@/lib/feedObservability";
import { getReconciliationHealth, startReconciliationWorker } from "@/lib/reconciliationService";

const driftEntityLabel = (value: string): "Blog" | "Forum" | "Other" => {
  if (value.startsWith("blog")) return "Blog";
  if (value.startsWith("forum")) return "Forum";
  return "Other";
};

export async function GET() {
  const allowed = await requireAdminApiAccess();
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  startReconciliationWorker();

  const now = Date.now();
  const oneMinuteAgo = new Date(now - 60_000);
  const fiveMinutesAgo = new Date(now - 5 * 60_000);
  const oneHourAgo = new Date(now - 60 * 60_000);

  const [events1m, dwell1m, skip5m, total5m, failedPending, failedHighAttempts, recentDrifts] = await Promise.all([
    FeedEventModel.countDocuments({ created_at: { $gte: oneMinuteAgo } }),
    FeedEventModel.countDocuments({ event_type: "dwell_time", created_at: { $gte: oneMinuteAgo } }),
    FeedEventModel.countDocuments({ event_type: "skip", created_at: { $gte: fiveMinutesAgo } }),
    FeedEventModel.countDocuments({ created_at: { $gte: fiveMinutesAgo } }),
    FailedFeedEventModel.countDocuments({ status: "pending" }),
    FailedFeedEventModel.countDocuments({ status: "pending", attempts: { $gte: 3 } }),
    CounterDriftEventModel.find({ created_at: { $gte: oneHourAgo } }).sort({ created_at: -1 }).limit(15).lean(),
  ]);

  const queue = getFeedObservabilityHealth().queue;
  const reconciliation = getReconciliationHealth();
  const eventRatePerSec = events1m / 60;
  const dwellRatePerSec = dwell1m / 60;
  const skipRate = total5m > 0 ? skip5m / total5m : 0;
  const largeDriftRecent = recentDrifts.filter((item) => item.severity === "large").length;

  const healthStatus =
    failedHighAttempts >= 10 || largeDriftRecent >= 4 || failedPending >= 150
      ? "Needs attention"
      : failedPending >= 40 || largeDriftRecent >= 1 || queue.queued >= 80
        ? "Degraded"
        : "Healthy";

  return NextResponse.json({
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
  });
}
