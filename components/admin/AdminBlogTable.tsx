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
  const [liveActivityEnabled, setLiveActivityEnabled] = useState(false);
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

      const response = await fetch("/api/generate-bulk-blogs", {
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
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Blog CMS</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/stats"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Analytics
          </Link>
          <Link
            href="/admin/comments"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Moderate comments
          </Link>
          <Link
            href="/admin/forums"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Forums admin
          </Link>
          <button
            type="button"
            onClick={onAutopopulate}
            disabled={isAutopopulating}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-violet-800 disabled:opacity-50"
          >
            {isAutopopulating ? "Populating..." : "AutoPopulate Content"}
          </button>
          <button
            type="button"
            onClick={onToggleLiveActivity}
            disabled={togglingLiveActivity}
            className={`rounded-lg px-4 py-2 text-sm font-semibold !text-white transition disabled:opacity-50 ${
              liveActivityEnabled ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-500 hover:bg-slate-600"
            }`}
          >
            {togglingLiveActivity
              ? "Updating..."
              : liveActivityEnabled
                ? "Live Activity: ON"
                : "Live Activity: OFF"}
          </button>
          <button
            type="button"
            onClick={onGenerateBulk}
            disabled={isBulkGenerating}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isBulkGenerating ? "Generating..." : "Generate Random Blogs"}
          </button>
          <Link
            href="/admin/blog/new"
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-sky-800"
          >
            New post
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {bulkResult && (
        <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {bulkResult}
        </p>
      )}
      {autopopulateResult && (
        <p className="mb-4 rounded bg-violet-50 px-3 py-2 text-sm text-violet-700">
          AutoPopulate complete — {autopopulateResult}
        </p>
      )}

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, category, or tag…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <span className="self-center text-xs text-slate-500">
          {filtered.length} / {posts.length} posts
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          {posts.length === 0 ? "No posts found." : "No posts match your filter."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">
                  Views
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">
                  Upvotes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-800">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{post.category}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        post.published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">
                    {formatCount(post.view_count)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">
                    {formatCount(post.upvote_count)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatStableDate(post.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/blog/edit/${post.id}`}
                        className="text-sky-700 hover:text-sky-900"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingId === post.id ? "Deleting..." : "Delete"}
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
