"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ObservabilityPayload = {
  generated_at: string;
  status: "Healthy" | "Degraded" | "Needs attention";
  queue: {
    depth: number;
    flush_status: "idle" | "flushing";
    replay_backlog_size: number;
    failed_event_count: number;
    replaying: boolean;
  };
  reconciliation: {
    running: boolean;
    last_run_at: string | null;
    duration_ms: number;
    entities_scanned: number;
    corrections_made: number;
    small_drifts: number;
    large_drifts: number;
  };
  live_signals: {
    events_per_sec: number;
    dwell_events_per_sec: number;
    skip_rate: number;
  };
  recommendations: {
    impressions_last_hour: number;
    clicks_last_hour: number;
    ctr_last_hour: number;
    position_performance: Array<{
      position: number;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    quality: {
      ranking_runs: number;
      by_scope: { blog: number; tutorial: number };
      avg_candidate_count: number;
      avg_selected_count: number;
      avg_behavioral_influence: number;
      avg_freshness_influence: number;
      avg_diversity_unique_primary_tags: number;
    };
  };
  ask_ai: {
    total_requests: number;
    citation_compliance_rate: number;
    uncited_correction_rate: number;
    confidence_distribution: { high: number; medium: number; low: number };
    conflict_detection_rate: number;
    retrieval_source_mix_avg: {
      tutorial: number;
      blog: number;
      forum: number;
      short: number;
    };
  };
  latency: {
    feed_request_total_ms: LatencyStats;
    feed_cache_hit_total_ms: LatencyStats;
    feed_cache_miss_total_ms: LatencyStats;
    feed_stage_ms: {
      cache_read: LatencyStats;
      persona_fetch: LatencyStats;
      candidate_generation: LatencyStats;
      scoring: LatencyStats;
      build_feed_total: LatencyStats;
      cache_write: LatencyStats;
      event_enqueue: LatencyStats;
    };
    reconciliation_total_ms: LatencyStats;
    reconciliation_stage_ms: Record<string, LatencyStats>;
    observability_api_ms: LatencyStats;
  };
  drift_events: Array<{
    id: string;
    entity: "Blog" | "Forum" | "Other";
    metric: string;
    expected: number;
    actual: number;
    drift: number;
    drift_percent: number;
    severity: "small" | "large";
    created_at: string;
    entity_id: string;
  }>;
};

type LatencyStats = {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  baseline_p50: number | null;
  baseline_p95: number | null;
};

const toRelative = (iso: string | null): string => {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 10_000) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const fmtInt = (v: number): string => new Intl.NumberFormat("en-US").format(v);
const fmtRate = (v: number): string => v.toFixed(2);
const fmtPct = (v: number): string => `${v.toFixed(1)}%`;
const fmtMs = (v: number): string => `${v.toFixed(1)}ms`;
const baselineDelta = (current: number, baseline: number | null): string => {
  if (!baseline || baseline <= 0) return "n/a";
  const delta = ((current - baseline) / baseline) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
};

const badgeByStatus: Record<ObservabilityPayload["status"], string> = {
  Healthy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Degraded: "bg-amber-100 text-amber-700 border-amber-200",
  "Needs attention": "bg-rose-100 text-rose-700 border-rose-200",
};

export default function AdminObservabilityDashboard() {
  const [data, setData] = useState<ObservabilityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningRecon, setRunningRecon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      const res = await fetch("/api/admin/observability", { cache: "no-store" });
      const payload = (await res.json()) as ObservabilityPayload | { error?: string };
      if (!res.ok) throw new Error("error" in payload ? payload.error || "Failed to load dashboard." : "Failed to load dashboard.");
      setData(payload as ObservabilityPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard("initial");
    const timer = window.setInterval(() => {
      void fetchDashboard("refresh");
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [fetchDashboard]);

  const queueTone = useMemo(() => {
    if (!data) return "bg-subtle text-slate-700 border-app";
    if (data.queue.failed_event_count >= 10 || data.queue.replay_backlog_size >= 150) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (data.queue.depth >= 80 || data.queue.replay_backlog_size >= 40) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }, [data]);

  const runReconciliationNow = useCallback(async () => {
    setRunningRecon(true);
    try {
      const res = await fetch("/api/admin/system/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to trigger reconciliation.");
      await fetchDashboard("refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger reconciliation.");
    } finally {
      setRunningRecon(false);
    }
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-app bg-surface p-5 text-sm text-slate-500">
        Loading observability dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error ?? "Failed to load observability dashboard."}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Reliability Observability</h2>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeByStatus[data.status]}`}>
            {data.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Updated {toRelative(data.generated_at)}</span>
          <button
            type="button"
            className="rounded-lg border border-app bg-surface px-2.5 py-1 font-medium text-slate-700 transition hover:bg-subtle"
            onClick={() => void fetchDashboard("refresh")}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${queueTone}`}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Feed event queue</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs opacity-70">Queue depth</p><p className="text-lg font-bold">{fmtInt(data.queue.depth)}</p></div>
            <div><p className="text-xs opacity-70">Flush status</p><p className="text-lg font-bold">{data.queue.flush_status}</p></div>
            <div><p className="text-xs opacity-70">Replay backlog</p><p className="text-lg font-bold">{fmtInt(data.queue.replay_backlog_size)}</p></div>
            <div><p className="text-xs opacity-70">Failed event count</p><p className="text-lg font-bold">{fmtInt(data.queue.failed_event_count)}</p></div>
          </div>
          <p className="mt-2 text-xs opacity-70">Replay worker: {data.queue.replaying ? "active" : "idle"}</p>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4 text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Reconciliation</p>
            <button
              type="button"
              className="rounded-lg border border-app px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void runReconciliationNow()}
              disabled={runningRecon}
            >
              {runningRecon ? "Running..." : "Run reconciliation now"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-500">Last run</p><p className="font-semibold">{toRelative(data.reconciliation.last_run_at)}</p></div>
            <div><p className="text-xs text-slate-500">Duration</p><p className="font-semibold">{fmtInt(data.reconciliation.duration_ms)} ms</p></div>
            <div><p className="text-xs text-slate-500">Entities scanned</p><p className="font-semibold">{fmtInt(data.reconciliation.entities_scanned)}</p></div>
            <div><p className="text-xs text-slate-500">Corrections made</p><p className="font-semibold">{fmtInt(data.reconciliation.corrections_made)}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-app bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live feed signals</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Events/sec</span><span className="font-semibold">{fmtRate(data.live_signals.events_per_sec)}</span></div>
            <div className="flex items-center justify-between"><span>Dwell events/sec</span><span className="font-semibold">{fmtRate(data.live_signals.dwell_events_per_sec)}</span></div>
            <div className="flex items-center justify-between"><span>Skip rate</span><span className="font-semibold">{fmtPct(data.live_signals.skip_rate * 100)}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Recommendation quality</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Impressions (1h)</span><span className="font-semibold">{fmtInt(data.recommendations.impressions_last_hour)}</span></div>
            <div className="flex items-center justify-between"><span>Clicks (1h)</span><span className="font-semibold">{fmtInt(data.recommendations.clicks_last_hour)}</span></div>
            <div className="flex items-center justify-between"><span>CTR (1h)</span><span className="font-semibold">{fmtPct(data.recommendations.ctr_last_hour * 100)}</span></div>
            <div className="flex items-center justify-between"><span>Ranking runs</span><span className="font-semibold">{fmtInt(data.recommendations.quality.ranking_runs)}</span></div>
            <div className="flex items-center justify-between"><span>Avg diversity tags</span><span className="font-semibold">{fmtRate(data.recommendations.quality.avg_diversity_unique_primary_tags)}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ask AI quality</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Requests</span><span className="font-semibold">{fmtInt(data.ask_ai.total_requests)}</span></div>
            <div className="flex items-center justify-between"><span>Citation compliance</span><span className="font-semibold">{fmtPct(data.ask_ai.citation_compliance_rate * 100)}</span></div>
            <div className="flex items-center justify-between"><span>Correction rate</span><span className="font-semibold">{fmtPct(data.ask_ai.uncited_correction_rate * 100)}</span></div>
            <div className="flex items-center justify-between"><span>Conflict detections</span><span className="font-semibold">{fmtPct(data.ask_ai.conflict_detection_rate * 100)}</span></div>
            <div className="flex items-center justify-between"><span>High confidence</span><span className="font-semibold">{fmtPct(data.ask_ai.confidence_distribution.high * 100)}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Feed latency (before vs after)</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-subtle p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Feed total p50/p95</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {fmtMs(data.latency.feed_request_total_ms.p50)} / {fmtMs(data.latency.feed_request_total_ms.p95)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                vs baseline: {baselineDelta(data.latency.feed_request_total_ms.p95, data.latency.feed_request_total_ms.baseline_p95)}
              </p>
            </div>
            <div className="rounded-xl bg-subtle p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cache hit p50/p95</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {fmtMs(data.latency.feed_cache_hit_total_ms.p50)} / {fmtMs(data.latency.feed_cache_hit_total_ms.p95)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                samples: {fmtInt(data.latency.feed_cache_hit_total_ms.count)}
              </p>
            </div>
            <div className="rounded-xl bg-subtle p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cache miss p50/p95</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {fmtMs(data.latency.feed_cache_miss_total_ms.p50)} / {fmtMs(data.latency.feed_cache_miss_total_ms.p95)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                samples: {fmtInt(data.latency.feed_cache_miss_total_ms.count)}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-5">
            <div className="rounded-lg bg-subtle px-2 py-1.5">cache: {fmtMs(data.latency.feed_stage_ms.cache_read.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">persona: {fmtMs(data.latency.feed_stage_ms.persona_fetch.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">candidates: {fmtMs(data.latency.feed_stage_ms.candidate_generation.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">scoring: {fmtMs(data.latency.feed_stage_ms.scoring.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">build total: {fmtMs(data.latency.feed_stage_ms.build_feed_total.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">write: {fmtMs(data.latency.feed_stage_ms.cache_write.p95)} p95</div>
            <div className="rounded-lg bg-subtle px-2 py-1.5">event: {fmtMs(data.latency.feed_stage_ms.event_enqueue.p95)} p95</div>
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Recommendation position performance (1h)</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 md:grid-cols-6">
            {data.recommendations.position_performance.map((item) => (
              <div key={item.position} className="rounded-lg bg-subtle px-2 py-1.5">
                pos {item.position}: {fmtPct(item.ctr * 100)} ({fmtInt(item.clicks)}/{fmtInt(item.impressions)})
              </div>
            ))}
            {data.recommendations.position_performance.length === 0 && (
              <div className="rounded-lg bg-subtle px-2 py-1.5 text-slate-500">No recommendation position data yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Reconciliation stage latency p95</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 md:grid-cols-5">
            {Object.entries(data.latency.reconciliation_stage_ms).map(([stage, stats]) => (
              <div key={stage} className="rounded-lg bg-subtle px-2 py-1.5">
                {stage.replace(/_/g, " ")}: {fmtMs(stats.p95)}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Drift events (last hour)</p>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-subtle text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Entity</th>
                  <th className="px-2 py-2 text-left font-semibold">Metric</th>
                  <th className="px-2 py-2 text-right font-semibold">Expected</th>
                  <th className="px-2 py-2 text-right font-semibold">Actual</th>
                  <th className="px-2 py-2 text-right font-semibold">Drift %</th>
                  <th className="px-2 py-2 text-left font-semibold">Severity</th>
                  <th className="px-2 py-2 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.drift_events.map((event) => (
                  <tr key={event.id} className={event.severity === "large" ? "bg-rose-50/70" : ""}>
                    <td className="px-2 py-2">{event.entity}</td>
                    <td className="px-2 py-2">{event.metric}</td>
                    <td className="px-2 py-2 text-right">{fmtInt(event.expected)}</td>
                    <td className="px-2 py-2 text-right">{fmtInt(event.actual)}</td>
                    <td className="px-2 py-2 text-right">{fmtPct(event.drift_percent)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${event.severity === "large" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-500">{toRelative(event.created_at)}</td>
                  </tr>
                ))}
                {data.drift_events.length === 0 && (
                  <tr>
                    <td className="px-2 py-6 text-center text-slate-400" colSpan={7}>
                      No drift events in the last hour.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
