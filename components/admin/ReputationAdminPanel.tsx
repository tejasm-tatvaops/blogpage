"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HistoryEvent = {
  reason: string;
  awarded_points: number;
  running_total: number;
  source_content_slug: string | null;
  note: string | null;
  created_at: string;
};

type RecomputeResult = {
  total: number;
  processed: number;
  updated: number;
  errors: number;
  score?: number;
};

type DryRunResult = {
  dryRun: true;
  wouldUpdate: number;
  sampleChanges: Array<{
    identity_key: string;
    current: number;
    recomputed: number;
    delta: number;
  }>;
};

const LS_KEY = "tatvaops_last_recompute_at";

function relativeTime(ts: number): string {
  const mins = Math.max(1, Math.floor((Date.now() - ts) / 60_000));
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ReputationAdminPanel() {
  const [identityKey, setIdentityKey] = useState("");
  const [points, setPoints] = useState("10");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recompute state
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<RecomputeResult | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);
  const [lastRecomputedAt, setLastRecomputedAt] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setLastRecomputedAt(Number(saved));
    // Tick every 30s so relative time updates while the page is open
    tickRef.current = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const loadAnalytics = async () => {
    const res = await fetch("/api/admin/reputation/analytics?days=14", { cache: "no-store" });
    const data = await res.json();
    setAnalytics(data);
  };

  const loadHistory = async () => {
    if (!identityKey.trim()) return;
    const res = await fetch(
      `/api/admin/reputation?identity_key=${encodeURIComponent(identityKey.trim())}&limit=100`,
      { cache: "no-store" },
    );
    const data = await res.json();
    setHistory((data as { history?: HistoryEvent[] }).history ?? []);
  };

  useEffect(() => { void loadAnalytics(); }, []);

  const submitAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_key: identityKey.trim(),
          points: Number(points),
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Adjustment failed.");
      }
      await Promise.all([loadHistory(), loadAnalytics()]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const runRecompute = async (opts: { singleKey?: string; dryRun?: boolean } = {}) => {
    setRecomputeBusy(true);
    setRecomputeResult(null);
    setDryRunResult(null);
    setRecomputeError(null);

    try {
      const body: Record<string, unknown> = {};
      if (opts.singleKey) body.identity_key = opts.singleKey;
      if (opts.dryRun) body.dryRun = true;

      const res = await fetch("/api/admin/reputation/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Recompute failed.");

      if ((data as { dryRun?: boolean }).dryRun) {
        setDryRunResult(data as DryRunResult);
      } else {
        setRecomputeResult(data as RecomputeResult);
        const now = Date.now();
        setLastRecomputedAt(now);
        localStorage.setItem(LS_KEY, String(now));
        await loadAnalytics();
      }
    } catch (err) {
      setRecomputeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setRecomputeBusy(false);
    }
  };

  const suspicious = useMemo(
    () => (analytics?.suspiciousActors as unknown[]) ?? [],
    [analytics],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app">Reputation Admin</h1>
        <p className="text-sm text-muted">Manual adjustments, event inspection, analytics, and abuse review.</p>
      </div>

      {/* ── Manual adjustment ─────────────────────────────────────────────── */}
      <section className="ui-card rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-app">Manual Point Adjustment</h2>
        <form onSubmit={submitAdjust} className="grid gap-3 md:grid-cols-4">
          <input
            className="ui-input rounded-md px-3 py-2 text-sm"
            placeholder="identity_key (fp:...)"
            value={identityKey}
            onChange={(e) => setIdentityKey(e.target.value)}
            required
          />
          <input
            className="ui-input rounded-md px-3 py-2 text-sm"
            placeholder="points"
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
          />
          <input
            className="ui-input rounded-md px-3 py-2 text-sm"
            placeholder="note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="ui-btn-primary rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Saving..." : "Apply"}
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
        <button
          type="button"
          onClick={loadHistory}
          className="mt-3 ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-medium"
        >
          Refresh Event Ledger
        </button>
      </section>

      {/* ── Recompute scores ──────────────────────────────────────────────── */}
      <section className="ui-card rounded-xl p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-app">Recompute Scores</h2>
            <p className="mt-0.5 text-xs text-muted">
              Re-applies current scoring rules to all users&apos; ledger history.
              Run after any point-value change.
            </p>
          </div>
          {lastRecomputedAt && (
            <p className="shrink-0 text-xs text-muted">
              Last recomputed: {relativeTime(lastRecomputedAt)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={recomputeBusy}
            onClick={() => void runRecompute()}
            className="ui-btn-primary rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {recomputeBusy ? "Recomputing…" : "Recompute All Scores"}
          </button>
          <button
            type="button"
            disabled={recomputeBusy || !identityKey.trim()}
            onClick={() => void runRecompute({ singleKey: identityKey.trim() })}
            className="ui-btn-secondary rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Recompute This User
          </button>
          <button
            type="button"
            disabled={recomputeBusy}
            onClick={() => void runRecompute({ dryRun: true })}
            className="ui-btn-secondary rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Dry Run
          </button>
        </div>

        {/* Live result */}
        {recomputeError && (
          <p className="mt-3 text-xs text-red-500">{recomputeError}</p>
        )}

        {recomputeResult && (
          <div className="mt-3 rounded-lg border border-app bg-subtle px-3 py-2 text-xs">
            <p className="font-semibold text-app">
              Recompute complete — {recomputeResult.updated}/{recomputeResult.total} updated
            </p>
            <p className="text-muted">
              Processed: {recomputeResult.processed} &nbsp;·&nbsp;
              Errors: {recomputeResult.errors}
              {recomputeResult.score !== undefined && (
                <> &nbsp;·&nbsp; New score: <strong>{recomputeResult.score}</strong></>
              )}
            </p>
          </div>
        )}

        {dryRunResult && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs">
            <p className="font-semibold text-amber-800">
              Dry run — would update {dryRunResult.wouldUpdate} users (no writes made)
            </p>
            {dryRunResult.sampleChanges.length > 0 && (
              <ul className="mt-2 space-y-1 text-amber-700">
                {dryRunResult.sampleChanges.map((c) => (
                  <li key={c.identity_key}>
                    <span className="font-mono">{c.identity_key.slice(0, 24)}…</span>
                    {" "}{c.current} → {c.recomputed}
                    {" "}
                    <span className={c.delta > 0 ? "text-emerald-700" : c.delta < 0 ? "text-red-600" : ""}>
                      ({c.delta > 0 ? "+" : ""}{c.delta})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── Event ledger + abuse review ───────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Reputation Event Inspection</h3>
          <div className="max-h-80 space-y-2 overflow-auto">
            {history.length === 0 ? (
              <p className="text-xs text-muted">No events loaded. Enter an identity key and refresh.</p>
            ) : history.map((evt, idx) => (
              <div key={`${evt.created_at}-${idx}`} className="rounded-md border border-app bg-subtle p-2 text-xs">
                <p className="font-medium text-app">
                  {evt.reason} ({evt.awarded_points > 0 ? "+" : ""}{evt.awarded_points})
                </p>
                <p className="text-muted">
                  Total: {evt.running_total}
                  {evt.source_content_slug ? ` • ${evt.source_content_slug}` : ""}
                </p>
                <p className="text-faint">
                  {new Date(evt.created_at).toLocaleString()}
                  {evt.note ? ` • ${evt.note}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Abuse / Fraud Review</h3>
          <div className="max-h-80 space-y-2 overflow-auto">
            {suspicious.length === 0 ? (
              <p className="text-xs text-muted">No suspicious actor clusters in the selected window.</p>
            ) : (suspicious as Array<{ _id: string; count: number; points: number }>).map((item) => (
              <div key={item._id} className="rounded-md border border-app bg-subtle p-2 text-xs">
                <p className="font-medium text-app">{item._id}</p>
                <p className="text-muted">Events: {item.count} • Points: {item.points}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top contributors + event distribution ─────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Top Contributors</h3>
          <div className="space-y-2">
            {((analytics?.topContributors as Array<{
              identity_key: string;
              display_name?: string;
              reputation_score: number;
              reputation_tier: string;
            }>) ?? []).slice(0, 10).map((u) => (
              <div
                key={u.identity_key}
                className="flex items-center justify-between rounded-md border border-app bg-subtle px-3 py-2 text-xs"
              >
                <span className="text-app">{u.display_name ?? u.identity_key}</span>
                <span className="text-muted">{u.reputation_score} • {u.reputation_tier}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Event Distribution (14d)</h3>
          <div className="space-y-2">
            {((analytics?.distribution as Array<{
              _id: string;
              count: number;
              points: number;
            }>) ?? []).slice(0, 10).map((row) => (
              <div
                key={row._id}
                className="flex items-center justify-between rounded-md border border-app bg-subtle px-3 py-2 text-xs"
              >
                <span className="text-app">{row._id}</span>
                <span className="text-muted">{row.count} events • {row.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
