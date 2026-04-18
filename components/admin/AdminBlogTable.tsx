"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { BlogPost } from "@/lib/blogService";

type AdminBlogTableProps = {
  posts: BlogPost[];
};

const formatStableDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatCount = (value: number): string => new Intl.NumberFormat("en-US").format(value);

export function AdminBlogTable({ posts }: AdminBlogTableProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [isAutopopulating, setIsAutopopulating] = useState(false);
  const [autopopulateResult, setAutopopulateResult] = useState<string | null>(null);
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(true);
  const [togglingLiveActivity, setTogglingLiveActivity] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/admin/activity/toggle", { method: "GET" });
        if (!response.ok) return;
        const payload = (await response.json()) as { enabled?: boolean };
        if (!cancelled) setLiveActivityEnabled(payload.enabled === true);
      } catch {
        // ignore non-critical status fetch failures
      }
    };
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter === "published" && !post.published) return false;
      if (statusFilter === "draft" && post.published) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, search, statusFilter]);

  const onDelete = async (id: string) => {
    if (deletingId) return;

    try {
      setError(null);
      setDeletingId(id);
      const response = await fetch(`/api/admin/blog/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error(json.error ?? "Failed to delete post.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const onGenerateBulk = async () => {
    if (isBulkGenerating) return;

    try {
      setError(null);
      setBulkResult(null);
      setIsBulkGenerating(true);

      const response = await fetch("/api/admin/generate-blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3, random: true }),
      });

      const json = (await response.json()) as {
        error?: string;
        createdCount?: number;
        skippedCount?: number;
        failedCount?: number;
      };
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error(json.error ?? "Bulk generation failed.");
      }

      setBulkResult(
        `Created ${json.createdCount ?? 0}, skipped ${json.skippedCount ?? 0}, failed ${json.failedCount ?? 0}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate blogs.");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const onAutopopulate = async () => {
    if (isAutopopulating) return;
    try {
      setError(null);
      setAutopopulateResult(null);
      setIsAutopopulating(true);
      const response = await fetch("/api/admin/autopopulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "blogs", limit: 20 }),
      });
      const json = (await response.json()) as {
        error?: string;
        postsProcessed?: number;
        commentsCreated?: number;
        repliesCreated?: number;
      };
      if (!response.ok) {
        if (response.status === 401) { router.push("/admin/login"); return; }
        throw new Error(json.error ?? "AutoPopulate failed.");
      }
      setAutopopulateResult(
        `Processed ${json.postsProcessed ?? 0} posts · ${json.commentsCreated ?? 0} comments · ${json.repliesCreated ?? 0} replies`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AutoPopulate failed.");
    } finally {
      setIsAutopopulating(false);
    }
  };

  const onLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const onToggleLiveActivity = async () => {
    if (togglingLiveActivity) return;
    const next = !liveActivityEnabled;
    try {
      setError(null);
      setTogglingLiveActivity(true);
      const response = await fetch("/api/admin/activity/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const payload = (await response.json()) as { error?: string; enabled?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "Failed to update live activity state.");
      setLiveActivityEnabled(payload.enabled === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle live activity.");
    } finally {
      setTogglingLiveActivity(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Blogs</h1>
          <p className="text-sm text-slate-500">{posts.length} posts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAutopopulate}
            disabled={isAutopopulating}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
          >
            {isAutopopulating ? "Populating…" : "AutoPopulate"}
          </button>
          <button
            type="button"
            onClick={onToggleLiveActivity}
            disabled={togglingLiveActivity}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              liveActivityEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {togglingLiveActivity ? "…" : liveActivityEnabled ? "Live: ON" : "Live: OFF"}
          </button>
          <button
            type="button"
            onClick={onGenerateBulk}
            disabled={isBulkGenerating}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
          >
            {isBulkGenerating ? "Generating…" : "Generate Blogs"}
          </button>
          <Link
            href="/admin/blog/new"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700"
          >
            New post
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Log out
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {bulkResult && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bulkResult}</div>
      )}
      {autopopulateResult && (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
          AutoPopulate complete — {autopopulateResult}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, category, or tag…"
          className="w-full max-w-xs rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-sky-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <span className="self-center text-xs text-slate-400">
          {filtered.length} / {posts.length} posts
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          {posts.length === 0 ? "No posts found." : "No posts match your filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Views</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Upvotes</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm text-slate-800">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 max-w-[300px] hover:text-violet-400 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{post.category}</td>
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      post.published
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-sm text-slate-600">{formatCount(post.view_count)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-sm text-slate-600">{formatCount(post.upvote_count)}</td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">{formatStableDate(post.created_at)}</td>
                  <td className="px-4 py-2.5 text-right text-sm">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/blog/edit/${post.id}`}
                        className="text-xs text-slate-600 transition hover:text-violet-700"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="text-xs text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === post.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
