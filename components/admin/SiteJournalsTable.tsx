"use client";

import { useEffect, useState } from "react";

type SiteJournalRow = {
  id: string;
  title: string;
  slug: string;
  city: string;
  region: string;
  timeline: { week: number; stage: string };
  health: "stable" | "watch" | "risk";
};

export function SiteJournalsTable() {
  const [rows, setRows] = useState<SiteJournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/site-journals?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { error?: string; journals?: SiteJournalRow[] };
      if (!res.ok) throw new Error(json.error ?? "Failed to load site journals.");
      setRows(json.journals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site journals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  async function patchJournal(id: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/site-journals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Update failed.");
    await load();
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-app">Site Journals</h1>
          <p className="text-sm text-muted">Moderate draft, review, published and archived journals.</p>
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-app bg-surface px-3 py-2 text-sm text-app"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error ? <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-app bg-surface p-4 text-sm text-muted">Loading site journals...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-app bg-surface">
          <table className="min-w-full text-sm">
            <thead className="border-b border-app">
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-muted">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Timeline</th>
                <th className="px-3 py-2">Health</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-app/60">
                  <td className="px-3 py-2">
                    <p className="font-medium text-app">{row.title}</p>
                    <p className="text-xs text-muted">{row.slug}</p>
                  </td>
                  <td className="px-3 py-2 text-muted">{row.city}, {row.region}</td>
                  <td className="px-3 py-2 text-muted">Week {row.timeline.week} • {row.timeline.stage}</td>
                  <td className="px-3 py-2 text-muted">{row.health}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void patchJournal(row.id, { status: "published" })} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Approve</button>
                      <button type="button" onClick={() => void patchJournal(row.id, { status: "archived" })} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">Archive</button>
                      <button type="button" onClick={() => void patchJournal(row.id, { moderation_status: "flagged" })} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">Flag</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">No site journals found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
