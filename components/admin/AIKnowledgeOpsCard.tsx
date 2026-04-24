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

export function AIKnowledgeOpsCard() {
  const [stats, setStats] = useState<SemanticStatsPayload>({ total: 0, lastIndexedAt: null });
  const [toggles, setToggles] = useState<TogglePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, togglesRes] = await Promise.all([
        fetch("/api/admin/semantic/reindex", { cache: "no-store" }),
        fetch("/api/admin/system/toggles", { cache: "no-store" }),
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onReindex = async () => {
    if (reindexing) return;
    setReindexing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/semantic/reindex", { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as { indexed?: number; error?: string };
      if (!res.ok) {
        setMessage(payload.error ?? "Reindex failed.");
        return;
      }
      setMessage(`Reindex complete. Indexed ${Number(payload.indexed ?? 0)} documents.`);
      await load();
    } finally {
      setReindexing(false);
    }
  };

  const chips = useMemo(
    () => [
      { label: "Semantic Recommendations", on: Boolean(toggles?.semanticRecommendationsEnabled) },
      { label: "Ask-AI Graph", on: Boolean(toggles?.askAiGraphEnabled) },
      { label: "Citation Enforcement", on: Boolean(toggles?.askAiCitationEnforcementEnabled) },
      { label: "Confidence Scoring", on: Boolean(toggles?.askAiConfidenceScoringEnabled) },
      { label: "Conflict Detection", on: Boolean(toggles?.askAiConflictDetectionEnabled) },
    ],
    [toggles],
  );

  return (
    <div className="mb-6 ui-card rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app">AI Knowledge Ops</h2>
          <p className="mt-1 text-xs text-muted">
            Manage semantic graph indexing and Ask-AI intelligence toggles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReindex()}
          disabled={reindexing}
          className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
        >
          {reindexing ? "Reindexing..." : "Reindex Semantic Graph"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
          <p className="text-muted">Indexed semantic docs</p>
          <p className="mt-1 text-base font-semibold text-app">{loading ? "..." : stats.total}</p>
        </div>
        <div className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
          <p className="text-muted">Last indexed</p>
          <p className="mt-1 text-sm font-medium text-app">
            {loading
              ? "..."
              : stats.lastIndexedAt
                ? new Date(stats.lastIndexedAt).toLocaleString()
                : "Never"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              chip.on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {chip.label}: {chip.on ? "On" : "Off"}
          </span>
        ))}
      </div>

      {message ? <p className="mt-3 text-xs text-sky-700">{message}</p> : null}
    </div>
  );
}

