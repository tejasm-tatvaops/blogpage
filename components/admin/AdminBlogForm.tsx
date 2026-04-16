"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/blogService";

// ── Types ────────────────────────────────────────────────────────────────────
type AdminBlogFormProps = {
  mode: "create" | "edit";
  initialPost?: BlogPost;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  publish_at: string; // ISO datetime string or ""
};

type QualityReport = {
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  suggestions: string[];
};

type DuplicateCheckResult = {
  hasDuplicate: boolean;
  threshold: number;
  similar: Array<{ slug: string; title: string; score: number }>;
};

type LinkResult = {
  content: string;
  linksAdded: number;
  linkMap: Array<{ keyword: string; slug: string }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = "admin-blog-form-draft";

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
};

const createSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const wordCount = (text: string): number =>
  text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

const readingTime = (text: string): number =>
  Math.max(1, Math.ceil(wordCount(text) / 200));

/** Convert an ISO string to the value expected by <input type="datetime-local"> */
const toDatetimeLocal = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    // datetime-local wants "YYYY-MM-DDTHH:mm" in local time
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
};

const defaultForm = (post?: BlogPost): FormState => ({
  title: post?.title ?? "",
  slug: post?.slug ?? "",
  excerpt: post?.excerpt ?? "",
  content: post?.content ?? "",
  cover_image: post?.cover_image ?? "",
  author: post?.author ?? "TatvaOps Editorial",
  category: post?.category ?? "",
  tags: normalizeTags(post?.tags),
  published: post?.published ?? false,
  publish_at: toDatetimeLocal(post?.publish_at),
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        {icon}
      </span>
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {children}
      </span>
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color =
    pct > 0.95 ? "text-red-500" : pct > 0.8 ? "text-amber-500" : "text-slate-400";
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {current}/{max}
    </span>
  );
}

function TagChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-sky-400 hover:bg-sky-100 hover:text-sky-700"
        aria-label={`Remove tag ${label}`}
      >
        ×
      </button>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdminBlogForm({ mode, initialPost }: AdminBlogFormProps) {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<DuplicateCheckResult | null>(null);
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isCheckingDup, setIsCheckingDup] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);

  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(() => {
    if (mode === "create" && typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<FormState>;
          const base = defaultForm(initialPost);
          return {
            ...base,
            ...parsed,
            tags: normalizeTags(parsed.tags),
          };
        }
      } catch {
        // start fresh
      }
    }
    return defaultForm(initialPost);
  });

  const words = useMemo(() => wordCount(form.content), [form.content]);
  const readMins = useMemo(() => readingTime(form.content), [form.content]);

  // Debounced auto-save (create mode only)
  useEffect(() => {
    if (mode !== "create") return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form));
        setAutoSavedAt(new Date());
      } catch {
        // quota
      }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [form, mode]);

  const clearDraft = () => {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
    setAutoSavedAt(null);
  };

  // ── Tag helpers ──
  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const currentTags = normalizeTags(form.tags);
    if (!tag || currentTags.includes(tag) || currentTags.length >= 10) return;
    setForm((prev) => ({ ...prev, tags: [...normalizeTags(prev.tags), tag] }));
  };

  const removeTag = (tag: string) =>
    setForm((prev) => ({ ...prev, tags: normalizeTags(prev.tags).filter((t) => t !== tag) }));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && tagInput === "") {
      const currentTags = normalizeTags(form.tags);
      if (currentTags.length > 0) {
        removeTag(currentTags[currentTags.length - 1]!);
      }
    }
  };

  // ── AI generation ──
  const onGenerate = useCallback(() => {
    if (isGenerating || !keyword.trim()) return;
    if (generateTimeoutRef.current) return;
    generateTimeoutRef.current = setTimeout(() => { generateTimeoutRef.current = null; }, 500);

    const run = async () => {
      try {
        setError(null);
        setIsGenerating(true);
        const response = await fetch("/api/generate-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: keyword.trim() }),
        });
        const json = (await response.json()) as {
          error?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          content?: string;
          tags?: string[];
          category?: string;
          cover_image?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "Failed to generate content.");

        setForm((prev) => ({
          ...prev,
          title: json.title ?? prev.title,
          slug: json.slug ?? createSlug(json.title ?? prev.title),
          excerpt: json.excerpt ?? prev.excerpt,
          content: json.content ?? prev.content,
          tags: normalizeTags(json.tags ?? prev.tags),
          category: json.category ?? prev.category,
          cover_image: json.cover_image ?? prev.cover_image,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate with AI.");
      } finally {
        setIsGenerating(false);
      }
    };
    void run();
  }, [isGenerating, keyword]);

  // ── Image file ──
  const onImageFileSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose a valid image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image is too large. Maximum size is 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) { setError("Failed to read image file."); return; }
      setError(null);
      setForm((prev) => ({ ...prev, cover_image: result }));
    };
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  // ── Submit ──
  const onSubmit = async (e: React.FormEvent, publishOverride?: boolean) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        tags: normalizeTags(form.tags),
        published: publishOverride !== undefined ? publishOverride : form.published,
        slug: form.slug || createSlug(form.title),
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : null,
      };

      const url =
        mode === "create"
          ? "/api/admin/blog"
          : `/api/admin/blog/${encodeURIComponent(initialPost!.id)}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to save post.");

      clearDraft();
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runQualityScore = async () => {
    if (isScoring || !form.title.trim() || !form.content.trim()) return;
    setIsScoring(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blog/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
        }),
      });
      const json = (await response.json()) as QualityReport & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to score content.");
      setQualityReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quality scoring failed.");
    } finally {
      setIsScoring(false);
    }
  };

  const runDuplicateCheck = async () => {
    if (isCheckingDup || form.content.trim().length < 100) return;
    setIsCheckingDup(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blog/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content,
          excludeSlug: form.slug || undefined,
        }),
      });
      const json = (await response.json()) as DuplicateCheckResult & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Duplicate check failed.");
      setDuplicateReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate check failed.");
    } finally {
      setIsCheckingDup(false);
    }
  };

  const runAutoLinking = async () => {
    if (isAutoLinking || form.content.trim().length < 50) return;
    setIsAutoLinking(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blog/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content,
          currentSlug: form.slug || undefined,
        }),
      });
      const json = (await response.json()) as LinkResult & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Internal linking failed.");
      setForm((prev) => ({ ...prev, content: json.content ?? prev.content }));
      setLinkResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Internal linking failed.");
    } finally {
      setIsAutoLinking(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-6 py-3">
          {/* Back */}
          <button
            type="button"
            onClick={() => router.push("/admin/blog")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Title + status badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-800">
              {mode === "create" ? "New blog post" : "Edit blog post"}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                form.published
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${form.published ? "bg-emerald-500" : "bg-amber-400"}`}
              />
              {form.published ? "Published" : "Draft"}
            </span>
          </div>

          {/* Auto-save indicator */}
          {mode === "create" && (
            <span className="ml-2 text-xs text-slate-400">
              {autoSavedAt
                ? `Auto-saved ${autoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Auto-saves as you type"}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {mode === "create" && (
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setForm(defaultForm());
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
              >
                Discard draft
              </button>
            )}

            {/* Save draft */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => { void onSubmit(e, false); }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Save draft
            </button>

            {/* Publish */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => { void onSubmit(e, true); }}
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : form.published ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 py-8">

        {/* ── AI Generator bar ── */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm">
          <div className="border-b border-indigo-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">AI Content Generator</p>
                <p className="text-xs text-slate-500">Enter a keyword or topic to generate a full blog post</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex gap-3">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onGenerate(); }}
                placeholder="e.g. BOQ software for contractors in India"
                maxLength={200}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2"
              />
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating || !keyword.trim()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                    Generate
                  </>
                )}
              </button>
            </div>
            {isGenerating && (
              <p className="mt-2 text-xs text-indigo-600">
                AI is writing your post — this usually takes 10–20 seconds…
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Main two-column grid ── */}
        <form onSubmit={(e) => { void onSubmit(e); }} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className="space-y-5">

            {/* Title */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Post title
                </label>
                <CharCount current={form.title.length} max={200} />
              </div>
              <input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug ? prev.slug : createSlug(title),
                  }));
                }}
                placeholder="Enter a compelling title…"
                maxLength={200}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-lg font-semibold text-slate-900 outline-none ring-sky-400 transition placeholder:font-normal placeholder:text-slate-400 focus:ring-2"
              />

              {/* Slug row */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="shrink-0 text-xs text-slate-400">/blog/</span>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: createSlug(e.target.value) }))
                  }
                  placeholder="url-slug"
                  maxLength={220}
                  required
                  className="min-w-0 flex-1 bg-transparent text-xs font-mono text-slate-600 outline-none placeholder:text-slate-400"
                />
                <CharCount current={form.slug.length} max={220} />
              </div>
            </div>

            {/* Excerpt */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <SectionLabel icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                }>Excerpt / Summary</SectionLabel>
                <CharCount current={form.excerpt.length} max={300} />
              </div>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Write a short summary shown on the blog listing page…"
                maxLength={300}
                rows={3}
                required
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none ring-sky-400 transition placeholder:text-slate-400 focus:ring-2"
              />
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <SectionLabel icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                }>Markdown content</SectionLabel>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{words.toLocaleString()} words</span>
                  <span className="h-3 w-px bg-slate-200"/>
                  <span>{readMins} min read</span>
                  <span className="h-3 w-px bg-slate-200"/>
                  <CharCount current={form.content.length} max={150_000} />
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runQualityScore}
                  disabled={isScoring || !form.title.trim() || !form.content.trim()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isScoring ? "Scoring..." : "AI quality score"}
                </button>
                <button
                  type="button"
                  onClick={runDuplicateCheck}
                  disabled={isCheckingDup || form.content.trim().length < 100}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isCheckingDup ? "Checking..." : "Check duplicate"}
                </button>
                <button
                  type="button"
                  onClick={runAutoLinking}
                  disabled={isAutoLinking || form.content.trim().length < 50}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isAutoLinking ? "Linking..." : "Auto internal links"}
                </button>
              </div>
              {qualityReport && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Grade {qualityReport.grade} ({qualityReport.overallScore}/100): SEO {qualityReport.seoScore},
                  Readability {qualityReport.readabilityScore}, Keyword {qualityReport.keywordDensity}
                </div>
              )}
              {duplicateReport && (
                <div
                  className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                    duplicateReport.hasDuplicate
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {duplicateReport.hasDuplicate
                    ? "Potential duplicate content detected. Review similar posts before publishing."
                    : "No strong duplicate matches detected."}
                </div>
              )}
              {linkResult && linkResult.linksAdded > 0 && (
                <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  Added {linkResult.linksAdded} internal links automatically.
                </div>
              )}
              <textarea
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={28}
                placeholder="Write your blog content in Markdown…&#10;&#10;## Introduction&#10;&#10;Start writing here…"
                maxLength={150_000}
                required
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 outline-none ring-sky-400 transition placeholder:font-sans placeholder:text-slate-400 focus:ring-2"
              />
            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <div className="space-y-5">

            {/* Publish status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionLabel icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              }>Status</SectionLabel>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {form.published ? "Published" : "Draft"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {form.published ? "Visible to all readers" : "Only visible to admins"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, published: !prev.published }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    form.published ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={form.published}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      form.published ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Scheduled publish */}
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Schedule publish
                </label>
                <input
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, publish_at: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none ring-sky-400 transition focus:ring-2"
                />
                {form.publish_at && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Post will go live at the scheduled time even if saved as draft.
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => { void onSubmit(e, false); }}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => { void onSubmit(e, true); }}
                  className="flex-1 rounded-xl bg-sky-600 py-2 text-xs font-semibold !text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving…" : "Publish"}
                </button>
              </div>
            </div>

            {/* Cover image */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }>Cover image</SectionLabel>
                {form.cover_image && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, cover_image: "" }))}
                    className="text-[11px] font-medium text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Preview */}
              {form.cover_image ? (
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-100">
                  <img
                    src={form.cover_image}
                    alt="Cover preview"
                    className="aspect-video w-full object-cover"
                    onError={() => setError("Cover image preview failed. Check URL or pick another image.")}
                  />
                </div>
              ) : (
                <div
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingImage(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    onImageFileSelected(e.dataTransfer.files?.[0] ?? null);
                  }}
                  onClick={() => imageFileInputRef.current?.click()}
                  className={`mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition ${
                    isDraggingImage
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <p className="text-xs text-slate-500">
                    {isDraggingImage ? "Drop to upload" : "Drop image or click to browse"}
                  </p>
                  <p className="text-[11px] text-slate-400">PNG, JPG, WebP · max 5 MB</p>
                </div>
              )}

              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageFileSelected(e.target.files?.[0] ?? null)}
              />

              <div className="flex items-center gap-2">
                <input
                  value={form.cover_image}
                  onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
                  placeholder="Or paste image URL…"
                  type="text"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none ring-sky-400 transition focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="flex-shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  title="Upload from device"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                </button>
              </div>
            </div>

            {/* Post details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionLabel icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }>Post details</SectionLabel>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Author name</label>
                  <input
                    value={form.author}
                    onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder="Author name"
                    maxLength={100}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-400 transition focus:ring-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Construction Tech"
                    maxLength={100}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-400 transition focus:ring-2"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                }>Tags</SectionLabel>
                <span className="text-[11px] text-slate-400">{form.tags.length}/10</span>
              </div>

              {/* Chip display */}
              {form.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
                  ))}
                </div>
              )}

              {/* Tag input */}
              <div
                className="flex cursor-text items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                onClick={() => tagInputRef.current?.focus()}
              >
                <svg width="12" height="12" className="flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput(""); } }}
                  placeholder="Add tag, press Enter…"
                  maxLength={40}
                  disabled={form.tags.length >= 10}
                  className="min-w-0 flex-1 bg-transparent text-xs text-slate-600 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Separate tags with Enter or comma</p>
            </div>

            {/* Stats card (read-only) */}
            {(words > 0 || form.title) && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <SectionLabel icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                }>Post stats</SectionLabel>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Words", value: words.toLocaleString() },
                    { label: "Read time", value: `${readMins} min` },
                    { label: "Title", value: `${form.title.length} chars` },
                    { label: "Tags", value: form.tags.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] text-slate-400">{label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
