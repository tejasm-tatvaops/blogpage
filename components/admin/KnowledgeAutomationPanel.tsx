"use client";

import { useEffect, useMemo, useState } from "react";

type TogglePayload = {
  semanticRecommendationsEnabled: boolean;
  askAiGraphEnabled: boolean;
  askAiCitationEnforcementEnabled: boolean;
  askAiConfidenceScoringEnabled: boolean;
  askAiConflictDetectionEnabled: boolean;
};

type SemanticStatsPayload = {
  total: number;
  lastIndexedAt: string | null;
};

type JobRow = {
  _id: string;
  type: string;
  status: string;
  created_at: string;
};

type RunResult = {
  label: string;
  detail: string;
  at: string;
};

export function KnowledgeAutomationPanel() {
  const [stats, setStats] = useState<SemanticStatsPayload>({ total: 0, lastIndexedAt: null });
  const [toggles, setToggles] = useState<TogglePayload | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);
  const [seoType, setSeoType] = useState<"vs" | "what-is" | "best-tools">("what-is");
  const [seoTopic, setSeoTopic] = useState("");
  const [seoCompareTo, setSeoCompareTo] = useState("");

  const pushResult = (result: RunResult) => {
    setResults((prev) => [result, ...prev].slice(0, 8));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, togglesRes, jobsRes] = await Promise.all([
        fetch("/api/admin/semantic/reindex", { cache: "no-store" }),
        fetch("/api/admin/system/toggles", { cache: "no-store" }),
        fetch("/api/admin/jobs", { cache: "no-store" }),
      ]);
      if (statsRes.ok) {
        const payload = (await statsRes.json()) as SemanticStatsPayload;
        setStats({
          total: Number(payload.total ?? 0),
          lastIndexedAt: payload.lastIndexedAt ? String(payload.lastIndexedAt) : null,
        });
      }
      if (togglesRes.ok) {
        setToggles((await togglesRes.json()) as TogglePayload);
      }
      if (jobsRes.ok) {
        const payload = (await jobsRes.json()) as { jobs?: JobRow[] };
        setJobs((payload.jobs ?? []).slice(0, 6));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (key: string, label: string, url: string, init?: RequestInit) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const res = await fetch(url, init);
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        pushResult({
          label,
          detail: String(payload.error ?? "Failed"),
          at: new Date().toLocaleTimeString(),
        });
        return;
      }
      const detail =
        payload.jobId
          ? `Started job ${String(payload.jobId)}`
          : Object.entries(payload)
              .filter(([k]) => k !== "ok")
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(" • ");
      pushResult({
        label,
        detail: detail || "Completed",
        at: new Date().toLocaleTimeString(),
      });
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const chips = useMemo(
    () => [
      { label: "Semantic Recs", on: Boolean(toggles?.semanticRecommendationsEnabled) },
      { label: "Ask-AI Graph", on: Boolean(toggles?.askAiGraphEnabled) },
      { label: "Citation", on: Boolean(toggles?.askAiCitationEnforcementEnabled) },
      { label: "Confidence", on: Boolean(toggles?.askAiConfidenceScoringEnabled) },
      { label: "Conflict", on: Boolean(toggles?.askAiConflictDetectionEnabled) },
    ],
    [toggles],
  );

  return (
    <div className="mb-6 ui-card rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app">Knowledge Automation Panel</h2>
          <p className="mt-1 text-xs text-muted">
            Run all intelligence pipelines and monitor system health in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-app bg-surface px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-subtle"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-app bg-subtle p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pipelines</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() =>
                void runAction(
                  "forum-trend",
                  "Forum to Draft",
                  "/api/admin/tutorials/trend-drafts",
                  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 5 }) },
                )}
              className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
            >
              Run Forum to Draft
            </button>
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => void runAction("research", "Research Pipeline", "/api/admin/research/pipeline", { method: "POST" })}
              className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
            >
              Run Research Pipeline
            </button>
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => void runAction("maintenance", "Maintenance Audit", "/api/admin/maintenance/audit", { method: "POST" })}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              Run Maintenance Audit
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-app bg-subtle p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">SEO + Funnels</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => void runAction("funnel", "Shorts Funnel Sync", "/api/admin/shorts/funnel-sync", { method: "POST" })}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              Sync Shorts Links
            </button>
            <button
              type="button"
              disabled={Boolean(busyKey)}
              onClick={() => void runAction("semantic", "Semantic Reindex", "/api/admin/semantic/reindex", { method: "POST" })}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              Reindex Semantic Graph
            </button>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <select
              value={seoType}
              onChange={(e) => setSeoType(e.target.value as "vs" | "what-is" | "best-tools")}
              className="rounded-md border border-app bg-app px-2 py-1.5 text-xs text-app"
            >
              <option value="what-is">What is X</option>
              <option value="best-tools">Best tools for X</option>
              <option value="vs">X vs Y</option>
            </select>
            <input
              value={seoTopic}
              onChange={(e) => setSeoTopic(e.target.value)}
              placeholder="Topic"
              className="rounded-md border border-app bg-app px-2 py-1.5 text-xs text-app"
            />
            <input
              value={seoCompareTo}
              onChange={(e) => setSeoCompareTo(e.target.value)}
              placeholder={seoType === "vs" ? "Compare to" : "Optional"}
              className="rounded-md border border-app bg-app px-2 py-1.5 text-xs text-app"
            />
          </div>
          <button
            type="button"
            disabled={Boolean(busyKey) || !seoTopic.trim()}
            onClick={() =>
              void runAction(
                "seo",
                "SEO Template Draft",
                "/api/admin/seo/templates/generate",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    templateType: seoType,
                    topic: seoTopic.trim(),
                    compareTo: seoCompareTo.trim() || undefined,
                  }),
                },
              )}
            className="rounded-md border border-fuchsia-300 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-60"
          >
            Generate SEO Draft
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
          <p className="text-muted">Semantic docs</p>
          <p className="mt-1 text-base font-semibold text-app">{loading ? "..." : stats.total}</p>
        </div>
        <div className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
          <p className="text-muted">Last indexed</p>
          <p className="mt-1 text-sm font-medium text-app">
            {loading ? "..." : stats.lastIndexedAt ? new Date(stats.lastIndexedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <div className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
          <p className="text-muted">Recent jobs tracked</p>
          <p className="mt-1 text-base font-semibold text-app">{loading ? "..." : jobs.length}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip.on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
          >
            {chip.label}: {chip.on ? "On" : "Off"}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-app bg-subtle p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent outputs</h4>
          {results.length === 0 ? (
            <p className="text-xs text-muted">No actions run yet.</p>
          ) : (
            <div className="space-y-1.5">
              {results.map((row) => (
                <div key={`${row.label}-${row.at}-${row.detail}`} className="rounded bg-app px-2 py-1 text-xs text-app">
                  <span className="font-semibold">{row.label}</span> - {row.detail} <span className="text-faint">({row.at})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-app bg-subtle p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent jobs</h4>
          {jobs.length === 0 ? (
            <p className="text-xs text-muted">No jobs available.</p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map((job) => (
                <div key={job._id} className="flex items-center justify-between rounded bg-app px-2 py-1 text-xs text-app">
                  <span className="truncate">{job.type}</span>
                  <span className={`ml-2 rounded px-1.5 py-0.5 ${job.status === "completed" ? "bg-emerald-100 text-emerald-700" : job.status === "failed" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

