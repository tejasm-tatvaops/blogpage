"use client";

import { useEffect, useMemo, useState } from "react";

type HistoryEvent = {
  reason: string;
  awarded_points: number;
  running_total: number;
  source_content_slug: string | null;
  note: string | null;
  created_at: string;
};

export function ReputationAdminPanel() {
  const [identityKey, setIdentityKey] = useState("");
  const [points, setPoints] = useState("10");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    const res = await fetch("/api/admin/reputation/analytics?days=14", { cache: "no-store" });
    const data = await res.json();
    setAnalytics(data);
  };

  const loadHistory = async () => {
    if (!identityKey.trim()) return;
    const res = await fetch(`/api/admin/reputation?identity_key=${encodeURIComponent(identityKey.trim())}&limit=100`, { cache: "no-store" });
    const data = await res.json();
    setHistory(data.history ?? []);
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const submitAdjust = async (e: React.FormEvent) => {
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
        throw new Error(body.error ?? "Adjustment failed.");
      }
      await Promise.all([loadHistory(), loadAnalytics()]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const suspicious = useMemo(() => analytics?.suspiciousActors ?? [], [analytics]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-app">Reputation Admin</h1>
        <p className="text-sm text-muted">Manual adjustments, event inspection, analytics, and abuse review.</p>
      </div>

      <section className="ui-card rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-app">Manual Point Adjustment</h2>
        <form onSubmit={submitAdjust} className="grid gap-3 md:grid-cols-4">
          <input className="ui-input rounded-md px-3 py-2 text-sm" placeholder="identity_key (fp:...)" value={identityKey} onChange={(e) => setIdentityKey(e.target.value)} required />
          <input className="ui-input rounded-md px-3 py-2 text-sm" placeholder="points" type="number" value={points} onChange={(e) => setPoints(e.target.value)} required />
          <input className="ui-input rounded-md px-3 py-2 text-sm" placeholder="note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" disabled={busy} className="ui-btn-primary rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60">
            {busy ? "Saving..." : "Apply"}
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
        <button type="button" onClick={loadHistory} className="mt-3 ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
          Refresh Event Ledger
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Reputation Event Inspection</h3>
          <div className="max-h-80 space-y-2 overflow-auto">
            {history.length === 0 ? (
              <p className="text-xs text-muted">No events loaded. Enter an identity key and refresh.</p>
            ) : history.map((evt, idx) => (
              <div key={`${evt.created_at}-${idx}`} className="rounded-md border border-app bg-subtle p-2 text-xs">
                <p className="font-medium text-app">{evt.reason} ({evt.awarded_points > 0 ? "+" : ""}{evt.awarded_points})</p>
                <p className="text-muted">Total: {evt.running_total} {evt.source_content_slug ? `• ${evt.source_content_slug}` : ""}</p>
                <p className="text-faint">{new Date(evt.created_at).toLocaleString()} {evt.note ? `• ${evt.note}` : ""}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Abuse / Fraud Review</h3>
          <div className="max-h-80 space-y-2 overflow-auto">
            {suspicious.length === 0 ? (
              <p className="text-xs text-muted">No suspicious actor clusters in the selected window.</p>
            ) : suspicious.map((item: any) => (
              <div key={item._id} className="rounded-md border border-app bg-subtle p-2 text-xs">
                <p className="font-medium text-app">{item._id}</p>
                <p className="text-muted">Events: {item.count} • Points: {item.points}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Top Contributors</h3>
          <div className="space-y-2">
            {(analytics?.topContributors ?? []).slice(0, 10).map((u: any) => (
              <div key={u.identity_key} className="flex items-center justify-between rounded-md border border-app bg-subtle px-3 py-2 text-xs">
                <span className="text-app">{u.display_name ?? u.identity_key}</span>
                <span className="text-muted">{u.reputation_score} • {u.reputation_tier}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ui-card rounded-xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-app">Event Distribution (14d)</h3>
          <div className="space-y-2">
            {(analytics?.distribution ?? []).slice(0, 10).map((row: any) => (
              <div key={row._id} className="flex items-center justify-between rounded-md border border-app bg-subtle px-3 py-2 text-xs">
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
