"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PROJECT_TYPE_OPTIONS = [
  "Residential Construction",
  "Villa Construction",
  "Commercial Tower",
  "Mid-rise Residential",
  "Industrial",
  "Infrastructure",
  "Interior Fit-out",
  "Mixed-use Development",
];

const CITY_OPTIONS = ["Bangalore", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];

const BUDGET_PRESETS = ["Under ₹50L", "₹50L – ₹1Cr", "₹1Cr – ₹5Cr", "₹5Cr – ₹25Cr", "₹25Cr+"];

const TAG_SUGGESTIONS = ["procurement", "residential", "RCC", "interiors", "MEP", "execution", "steel", "villa", "logistics"];

const FIELD_NOTE_EXAMPLES = ["procurement risks", "execution sequencing", "vendor changes", "milestone tracking", "field observations"];

export function SiteJournalCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    project_type: "",
    city: "",
    region: "",
    budget_range: "",
    description: "",
    cover_media: "",
    tags: [] as string[],
    timeline_start_date: new Date().toISOString().slice(0, 10),
    visibility: "public",
  });

  const filteredTagSuggestions = useMemo(() => {
    const needle = tagInput.trim().toLowerCase();
    return TAG_SUGGESTIONS.filter((tag) => !form.tags.includes(tag)).filter((tag) => !needle || tag.toLowerCase().includes(needle)).slice(0, 6);
  }, [form.tags, tagInput]);

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/^#/, "");
    if (!value) return;
    setForm((prev) => {
      if (prev.tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, tags: [...prev.tags, value].slice(0, 12) };
    });
    setTagInput("");
  };

  const removeTag = (value: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== value) }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/site-journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags,
          timeline_start_date: new Date(form.timeline_start_date).toISOString(),
        }),
      });
      const json = (await res.json()) as { error?: string; journal?: { slug: string } };
      if (!res.ok || !json.journal?.slug) throw new Error(json.error ?? "Failed to create site journal.");
      router.push(`/projects/${json.journal.slug}?startFieldNote=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site journal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-2xl border border-app bg-surface p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">Start Site Journal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-app md:text-4xl">
            Begin documenting your construction execution journey
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Track weekly execution updates, procurement risks, field decisions, and operational insights over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["AI-assisted summaries", "Week-by-week field notes", "Operational timeline memory"].map((item) => (
              <span key={item} className="rounded-full border border-app bg-subtle px-3 py-1 text-muted">
                • {item}
              </span>
            ))}
          </div>
        </section>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <section className="rounded-2xl border border-app bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Project Basics</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Site Title" className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
            <input list="project-type-options" required value={form.project_type} onChange={(event) => setForm((prev) => ({ ...prev, project_type: event.target.value }))} placeholder="Project Type" className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
            <datalist id="project-type-options">
              {PROJECT_TYPE_OPTIONS.map((option) => <option key={option} value={option} />)}
            </datalist>
            <input list="city-options" required value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
            <datalist id="city-options">
              {CITY_OPTIONS.map((option) => <option key={option} value={option} />)}
            </datalist>
            <input required value={form.region} onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))} placeholder="Region" className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Budget + Timeline</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <select value={form.budget_range} onChange={(event) => setForm((prev) => ({ ...prev, budget_range: event.target.value }))} className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]">
              <option value="">Select budget range</option>
              {BUDGET_PRESETS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input type="date" required value={form.timeline_start_date} onChange={(event) => setForm((prev) => ({ ...prev, timeline_start_date: event.target.value }))} className="h-11 rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Cover Media</p>
          <div className="mt-3 rounded-xl border border-dashed border-app bg-subtle/60 p-4">
            <p className="text-xs text-muted">Paste a site image, rendering, drone capture, or execution photo</p>
            <input value={form.cover_media} onChange={(event) => setForm((prev) => ({ ...prev, cover_media: event.target.value }))} placeholder="Paste media URL" className="mt-3 h-11 w-full rounded-lg border border-app bg-surface px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]" />
            {form.cover_media ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-app bg-black/80">
                <img src={form.cover_media} alt="Cover preview" className="h-40 w-full object-cover" />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Tags</p>
          <div className="mt-3 rounded-lg border border-app bg-surface p-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => removeTag(tag)} className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700 transition hover:bg-orange-100">
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
                  addTag(tagInput);
                }
              }}
              placeholder="Type and press enter/comma"
              className="h-9 w-full rounded-md border border-app px-3 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredTagSuggestions.map((tag) => (
                <button key={tag} type="button" onClick={() => addTag(tag)} className="rounded-full bg-subtle px-2.5 py-1 text-xs text-muted transition hover:bg-orange-50 hover:text-orange-700">
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">What is this site journal tracking?</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Tracking procurement volatility, labor coordination, and execution progress for a G+2 residential build in Miyapur."
            rows={5}
            className="mt-3 w-full rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app transition focus:border-orange-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.18)]"
          />
          <p className="mt-2 text-xs text-muted">
            Example dimensions: {FIELD_NOTE_EXAMPLES.join(" • ")}
          </p>
        </section>

        <div className="rounded-2xl border border-app bg-surface p-5">
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60">
            {loading ? "Starting..." : "Start Site Journal"}
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Your journal starts as a draft and can evolve week-by-week over time.
          </p>
        </div>
      </form>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="space-y-4 rounded-2xl border border-app bg-surface p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">What is a Site Journal?</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              A Site Journal is a living execution diary that evolves through weekly field updates, AI insights, procurement observations, and operational memory.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app">Example field notes</p>
            <div className="mt-2 space-y-3 text-xs text-muted">
              <div className="rounded-lg border border-app/70 bg-subtle p-3">
                <p className="font-semibold text-app">Week 12 — Procurement pressure increasing</p>
                <p className="mt-1">Steel suppliers revised transport pricing after logistics delays across Hyderabad corridor.</p>
              </div>
              <div className="rounded-lg border border-app/70 bg-subtle p-3">
                <p className="font-semibold text-app">Week 18 — Vendor sequencing stabilized</p>
                <p className="mt-1">Painting and MEP crews restructured to reduce overlap rework.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app">AI Assistance</p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>- summarize weekly execution</li>
              <li>- detect procurement risks</li>
              <li>- improve operational clarity</li>
              <li>- identify recurring delays</li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app">What gets documented?</p>
            <p className="mt-2 text-xs text-muted">
              Procurement decisions, sequencing pivots, field incidents, milestone transitions, and on-site visual evidence.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
