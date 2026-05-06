"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ENTRY_TYPES = [
  "Execution Update",
  "Procurement Insight",
  "Labor Update",
  "Vendor Change",
  "Risk Alert",
  "Milestone",
  "Cost Change",
  "Material Delivery",
  "AI Observation",
  "Field Note",
] as const;

export function SiteJournalEntryComposer({
  slug,
  currentWeek,
  currentSummary,
  showFirstNoteHint = false,
  variant = "inline",
  onSubmitted,
}: {
  slug: string;
  currentWeek: number;
  currentSummary?: string;
  showFirstNoteHint?: boolean;
  variant?: "inline" | "modal";
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    week_number: currentWeek + 1,
    entry_type: "Execution Update",
    title: "",
    content: "",
    media: "",
    tags: "",
    risk_level: "low",
    related_discussion_ids: "",
  });

  const aiHint = useMemo(() => {
    if (!form.content.trim()) return "";
    if (form.content.toLowerCase().includes("delay") || form.content.toLowerCase().includes("supplier")) {
      return "Procurement Update: Delivery instability may impact execution sequencing. Potential risk: regional transport volatility.";
    }
    return "AI suggestion: Use execution impact, immediate action, and next-week expectation in 2-3 lines.";
  }, [form.content]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const media = form.media
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((url) => ({ type: "image", url, caption: "Site evidence" }));
      const res = await fetch(`/api/site-journals/${encodeURIComponent(slug)}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_number: Number(form.week_number),
          entry_type: form.entry_type,
          title: form.title,
          content: form.content,
          media,
          tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
          risk_level: form.risk_level,
          related_discussion_ids: form.related_discussion_ids.split(",").map((item) => item.trim()).filter(Boolean),
          ai_insight: aiHint || currentSummary || "",
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save field note.");
      router.refresh();
      setForm((prev) => ({ ...prev, title: "", content: "", media: "", tags: "", related_discussion_ids: "" }));
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field note.");
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    setSubmittingReview(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-journals/${encodeURIComponent(slug)}/submit`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to submit for review.");
      router.refresh();
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit for review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <section
      id="entry-composer"
      className={
        variant === "modal"
          ? "rounded-2xl border border-app bg-surface p-4"
          : "mb-6 rounded-2xl border border-app bg-surface p-4"
      }
    >
      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600">{showFirstNoteHint ? "Start your first field note" : `Continue Week ${currentWeek + 1} Update`}</p>
        <h3 className="mt-1 text-lg font-semibold text-app">Continue Journal</h3>
        <p className="mt-1 text-sm text-muted">Document this week as a field note from site reality, then let AI sharpen operational clarity.</p>
      </div>
      {error ? <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input type="number" min={1} value={form.week_number} onChange={(event) => setForm((prev) => ({ ...prev, week_number: Number(event.target.value) }))} className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app" />
        <select value={form.entry_type} onChange={(event) => setForm((prev) => ({ ...prev, entry_type: event.target.value }))} className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app">
          {ENTRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Week title (example: Procurement pressure increasing)" className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app md:col-span-2" />
        <textarea required value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} placeholder="What changed this week on site?" rows={4} className="rounded-lg border border-app bg-white px-3 py-2 text-sm text-app md:col-span-2" />
        <input value={form.media} onChange={(event) => setForm((prev) => ({ ...prev, media: event.target.value }))} placeholder="Media URLs (comma separated)" className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app md:col-span-2" />
        <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma separated)" className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app" />
        <select value={form.risk_level} onChange={(event) => setForm((prev) => ({ ...prev, risk_level: event.target.value }))} className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app">
          <option value="low">Risk: Low</option>
          <option value="medium">Risk: Medium</option>
          <option value="high">Risk: High</option>
        </select>
        <input value={form.related_discussion_ids} onChange={(event) => setForm((prev) => ({ ...prev, related_discussion_ids: event.target.value }))} placeholder="Related discussion slugs (comma separated)" className="h-10 rounded-lg border border-app bg-white px-3 text-sm text-app md:col-span-2" />
        {aiHint ? <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 md:col-span-2">AI writing helper: {aiHint}</p> : null}
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={() => void submitForReview()} disabled={submittingReview} className="rounded-lg border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-60">
            {submittingReview ? "Submitting..." : "Submit for Review"}
          </button>
          <button type="submit" disabled={loading} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60">
            {loading ? "Saving..." : "Save Week Update"}
          </button>
        </div>
      </form>
    </section>
  );
}
