"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VideoPost } from "@/models/VideoPost";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString();

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

// ─── Add Video Form ───────────────────────────────────────────────────────────

const CATEGORIES = [
  "Construction", "Estimation & Costing", "Project Management", "Structural",
  "MEP", "Materials", "Architecture", "Real Estate", "Infrastructure", "Safety", "General",
];

type AddVideoFormProps = {
  onCreated: (post: VideoPost) => void;
};

function AddVideoForm({ onCreated }: AddVideoFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [form, setForm] = useState({
    sourceType: "youtube" as VideoPost["sourceType"],
    youtubeVideoId: "",
    videoUrl: "",
    title: "",
    shortCaption: "",
    category: "Construction",
    tags: "",
    linkedBlogSlug: "",
    linkedForumSlug: "",
    durationSeconds: "",
    published: false,
  });

  const field = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fetchSuggestions = useCallback(async () => {
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tags.length) return;
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    const data = (await res.json()) as { suggestions?: string[] };
    setSuggestions(data.suggestions ?? []);
  }, [form.tags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        sourceType: form.sourceType,
        youtubeVideoId: form.sourceType === "youtube" ? form.youtubeVideoId.trim() || null : null,
        videoUrl: form.sourceType !== "youtube" ? form.videoUrl.trim() || null : null,
        title: form.title.trim(),
        shortCaption: form.shortCaption.trim(),
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        linkedBlogSlug: form.linkedBlogSlug.trim() || null,
        linkedForumSlug: form.linkedForumSlug.trim() || null,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
        published: form.published,
      };
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { post?: VideoPost; error?: string };
      if (!res.ok || !data.post) throw new Error(data.error ?? "Failed to create video.");
      onCreated(data.post);
      setOpen(false);
      setForm({
        sourceType: "youtube", youtubeVideoId: "", videoUrl: "",
        title: "", shortCaption: "", category: "Construction", tags: "",
        linkedBlogSlug: "", linkedForumSlug: "", durationSeconds: "", published: false,
      });
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating video.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400";

  return (
    <div>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Add video
        </button>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Add video post</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Source type */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Source type</label>
              <div className="flex gap-3">
                {(["youtube", "uploaded", "curated"] as const).map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="sourceType"
                      value={t}
                      checked={form.sourceType === t}
                      onChange={() => field("sourceType", t)}
                      className="accent-slate-800"
                    />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* YouTube ID or Video URL */}
            {form.sourceType === "youtube" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">YouTube video ID *</label>
                <input
                  required
                  placeholder="e.g. dQw4w9WgXcQ"
                  value={form.youtubeVideoId}
                  onChange={(e) => field("youtubeVideoId", e.target.value)}
                  className={inputClass}
                />
                {form.youtubeVideoId && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Preview: youtube.com/watch?v={form.youtubeVideoId}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Video URL *</label>
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={form.videoUrl}
                  onChange={(e) => field("videoUrl", e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Duration (seconds)</label>
              <input
                type="number"
                min={1}
                max={3600}
                placeholder="e.g. 58"
                value={form.durationSeconds}
                onChange={(e) => field("durationSeconds", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Title *</label>
              <input
                required
                placeholder="BOQ walkthrough for residential project"
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Short caption */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Short caption * <span className="text-slate-400">(shown over video)</span></label>
              <textarea
                required
                rows={2}
                maxLength={400}
                placeholder="Inshorts-style summary shown over the video..."
                value={form.shortCaption}
                onChange={(e) => field("shortCaption", e.target.value)}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{form.shortCaption.length}/400</p>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Category *</label>
              <select
                value={form.category}
                onChange={(e) => field("category", e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tags <span className="text-slate-400">(comma-separated)</span></label>
              <input
                placeholder="construction, boq, estimation"
                value={form.tags}
                onChange={(e) => field("tags", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* YouTube query suggestions */}
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={fetchSuggestions}
                className="mb-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
              >
                Generate YouTube search suggestions from tags
              </button>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <span key={s} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Linked blog/forum slugs */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Linked blog slug</label>
              <input
                placeholder="e.g. construction-cost-estimation"
                value={form.linkedBlogSlug}
                onChange={(e) => field("linkedBlogSlug", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Linked forum slug</label>
              <input
                placeholder="e.g. boq-tips-for-site-managers"
                value={form.linkedForumSlug}
                onChange={(e) => field("linkedForumSlug", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Publish toggle */}
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="pub"
                checked={form.published}
                onChange={(e) => field("published", e.target.checked)}
                className="accent-slate-800"
              />
              <label htmlFor="pub" className="text-sm text-slate-700">Publish immediately</label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create video"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Video row ────────────────────────────────────────────────────────────────

function VideoRow({ post, onDelete, onTogglePublish }: {
  post: VideoPost;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, published: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/admin/videos/${post.id}`, { method: "DELETE" }).catch(() => undefined);
    onDelete(post.id);
  };

  const handleToggle = async () => {
    setToggling(true);
    const res = await fetch(`/api/admin/videos/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    }).catch(() => null);
    if (res?.ok) onTogglePublish(post.id, !post.published);
    setToggling(false);
  };

  return (
    <tr className="group border-b border-slate-100 hover:bg-slate-50">
      {/* Thumbnail */}
      <td className="py-3 pl-4 pr-3 w-20">
        {post.thumbnailUrl ? (
          <div className="relative h-12 w-20 overflow-hidden rounded-lg bg-slate-200">
            <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover" sizes="80px" />
          </div>
        ) : (
          <div className="h-12 w-20 rounded-lg bg-slate-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" aria-hidden>
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </td>

      {/* Title + meta */}
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-0.5">
          <Link href={`/shorts/${post.slug}`} target="_blank" className="text-sm font-medium text-slate-900 hover:text-slate-600 line-clamp-1">
            {post.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className={`rounded px-1.5 py-0.5 font-medium ${post.sourceType === "youtube" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {post.sourceType}
            </span>
            <span>{post.category}</span>
            {post.tags.slice(0, 2).map((t) => <span key={t}>#{t}</span>)}
          </div>
        </div>
      </td>

      {/* Stats */}
      <td className="py-3 pr-4 text-center">
        <div className="text-sm font-medium tabular-nums text-slate-700">{fmt(post.views)}</div>
        <div className="text-[11px] text-slate-400">views</div>
      </td>
      <td className="py-3 pr-4 text-center">
        <div className="text-sm font-medium tabular-nums text-slate-700">{fmt(post.likes)}</div>
        <div className="text-[11px] text-slate-400">likes</div>
      </td>

      {/* Created */}
      <td className="py-3 pr-4 text-[12px] text-slate-500">{formatDate(post.createdAt)}</td>

      {/* Status + actions */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={toggling}
            onClick={handleToggle}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              post.published
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {post.published ? "Published" : "Draft"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="rounded p-1 text-slate-300 transition hover:text-red-500"
            aria-label="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main table component ─────────────────────────────────────────────────────

type AdminVideoTableProps = {
  initialPosts: VideoPost[];
};

export function AdminVideoTable({ initialPosts }: AdminVideoTableProps) {
  const [posts, setPosts] = useState<VideoPost[]>(initialPosts);

  const handleCreated = useCallback((post: VideoPost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleTogglePublish = useCallback((id: string, published: boolean) => {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, published } : p));
  }, []);

  return (
    <div className="space-y-5">
      <AddVideoForm onCreated={handleCreated} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="py-3 pl-4 pr-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400 w-20">Thumb</th>
              <th className="py-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Title</th>
              <th className="py-3 pr-4 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">Views</th>
              <th className="py-3 pr-4 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">Likes</th>
              <th className="py-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Created</th>
              <th className="py-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  No videos yet. Add a YouTube Short or upload a clip above.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <VideoRow
                  key={post.id}
                  post={post}
                  onDelete={handleDelete}
                  onTogglePublish={handleTogglePublish}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
