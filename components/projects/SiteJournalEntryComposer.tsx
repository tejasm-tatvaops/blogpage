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
  const [tagInput, setTagInput] = useState("");
  const [showOperationalContext, setShowOperationalContext] = useState(false);
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

  const tagChips = useMemo(
    () => form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    [form.tags],
  );
  const mediaUrls = useMemo(
    () => form.media.split(",").map((url) => url.trim()).filter(Boolean),
    [form.media],
  );
  const suggestedTags = ["procurement", "RCC", "vendor", "steel", "execution", "delay-risk"];
  const sectionClass = "rounded-xl border border-app bg-surface p-3";
  const controlClass = "h-10 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.2)]";
  const textAreaClass = "mt-2 min-h-[220px] w-full rounded-lg border border-app bg-surface px-3 py-3 text-sm leading-7 text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.2)]";

  const addTagChip = (value: string) => {
    const next = value.trim().replace(/^#/, "");
    if (!next) return;
    const merged = [...new Set([...tagChips, next])];
    setForm((prev) => ({ ...prev, tags: merged.join(", ") }));
    setTagInput("");
  };
  const removeTagChip = (value: string) => {
    const next = tagChips.filter((tag) => tag.toLowerCase() !== value.toLowerCase());
    setForm((prev) => ({ ...prev, tags: next.join(", ") }));
  };

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
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600">{showFirstNoteHint ? "Start your first field note" : `Continue Week ${currentWeek + 1} Update`}</p>
        <h3 className="mt-1 text-lg font-semibold text-app">Continue Journal</h3>
        <p className="mt-1 text-sm text-muted">Document this week as a field note from site reality, then let AI sharpen operational clarity.</p>
      </div>
      {error ? <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <form onSubmit={submit} className="space-y-4">
        <section className={sectionClass}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Execution Context</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input type="number" min={1} value={form.week_number} onChange={(event) => setForm((prev) => ({ ...prev, week_number: Number(event.target.value) }))} className={controlClass} />
            <select value={form.entry_type} onChange={(event) => setForm((prev) => ({ ...prev, entry_type: event.target.value }))} className={controlClass}>
              {ENTRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={form.risk_level} onChange={(event) => setForm((prev) => ({ ...prev, risk_level: event.target.value }))} className={controlClass}>
              <option value="low">Risk: Low</option>
              <option value="medium">Risk: Medium</option>
              <option value="high">Risk: High</option>
            </select>
          </div>
        </section>

        <section className={sectionClass}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Journal Narrative</p>
          <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Example: Procurement pressure increasing before slab cycle" className={`w-full ${controlClass}`} />
          <textarea required value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} placeholder="Describe what actually changed on site this week...\n\nExamples: procurement shifts, labor coordination, vendor issues, execution progress, delays, field observations." rows={8} className={textAreaClass} />
          <p className="mt-2 text-xs text-app/70">AI can help summarize operational risk and improve clarity.</p>
          {aiHint ? <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">AI writing helper: {aiHint}</p> : null}
        </section>

        <section className={sectionClass}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Media</p>
          <div className="rounded-lg border border-dashed border-app bg-subtle p-3">
            <p className="text-xs text-app/70">Drop site captures, drone visuals, procurement snapshots, or execution photos.</p>
            <input value={form.media} onChange={(event) => setForm((prev) => ({ ...prev, media: event.target.value }))} placeholder="Media URLs (comma separated)" className={`mt-2 w-full ${controlClass}`} />
            {mediaUrls.length ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {mediaUrls.slice(0, 4).map((url) => (
                  <div key={url} className="overflow-hidden rounded-lg border border-app bg-black/70">
                    <img src={url} alt="Site media preview" className="h-20 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className={sectionClass}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Tags</p>
          <div className="rounded-lg border border-app bg-surface p-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {tagChips.map((tag) => (
                <button key={tag} type="button" onClick={() => removeTagChip(tag)} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700 transition hover:bg-orange-100">
                  #{tag} ×
                </button>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTagChip(tagInput);
                }
              }}
              placeholder="Type tag and press enter"
              className="h-9 w-full rounded-md border border-app px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.2)]"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestedTags.filter((tag) => !tagChips.includes(tag)).map((tag) => (
                <button key={tag} type="button" onClick={() => addTagChip(tag)} className="rounded-full bg-subtle px-2 py-0.5 text-xs text-app/70 transition hover:bg-orange-50 hover:text-orange-700">
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <button
            type="button"
            onClick={() => setShowOperationalContext((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-app bg-surface px-3 py-2 text-left text-sm font-medium text-app"
          >
            <span>Attach operational context</span>
            <span>{showOperationalContext ? "−" : "+"}</span>
          </button>
          {showOperationalContext ? (
            <input value={form.related_discussion_ids} onChange={(event) => setForm((prev) => ({ ...prev, related_discussion_ids: event.target.value }))} placeholder="Related discussion slugs (comma separated)" className={`mt-2 w-full ${controlClass}`} />
          ) : null}
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button type="button" onClick={() => void submitForReview()} disabled={submittingReview} className="rounded-lg border border-orange-300 bg-surface px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-60">
            {submittingReview ? "Submitting..." : "Submit for Review"}
          </button>
          <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:from-orange-400 hover:to-amber-400 disabled:opacity-60">
            {loading ? "Saving..." : "Save Week Update"}
          </button>
        </div>
        <p className="text-xs text-app/70">Your site journal evolves week-by-week and remains editable before approval.</p>
      </form>
    </section>
  );
}
