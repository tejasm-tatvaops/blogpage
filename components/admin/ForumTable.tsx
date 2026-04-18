"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ForumFeedSort, ForumPost } from "@/lib/forumService";
import { ForumActions } from "./ForumActions";
import { GenerateForumsButton } from "./GenerateForumsButton";
import { JobQueuePanel } from "./JobQueuePanel";

type ForumApiResult = {
  posts: ForumPost[];
  total: number;
  page: number;
  totalPages: number;
};

const PAGE_SIZE = 20;

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

export function ForumTable() {
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ForumFeedSort>("hot");
  const [tagFilter, setTagFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [featureUpdatingId, setFeatureUpdatingId] = useState<string | null>(null);
  const [isAutopopulating, setIsAutopopulating] = useState(false);
  const [autopopulateResult, setAutopopulateResult] = useState<string | null>(null);
  const [jobQueueTick, setJobQueueTick] = useState(0);
  const [reloadTick, setReloadTick] = useState(0);

  const queryTags = useMemo(() => {
    const tags = new Set<string>();
    for (const post of posts) {
      for (const tag of post.tags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL("/api/forums", window.location.origin);
        url.searchParams.set("admin", "true");
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("sort", sort);
        if (tagFilter !== "all") url.searchParams.set("tag", tagFilter);
        if (search.trim()) url.searchParams.set("q", search.trim());

        const response = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        const json = (await response.json()) as ForumApiResult & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Failed to load forum posts.");
        setPosts(json.posts);
        setTotal(json.total);
        setPage(json.page);
        setTotalPages(json.totalPages || 1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load forum posts.");
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [page, router, search, sort, tagFilter, reloadTick]);

  const onDelete = async (id: string) => {
    if (deletingId) return;
    const confirmed = window.confirm("Delete this forum post?");
    if (!confirmed) return;
    setDeletingId(id);
    setError(null);
    const previous = posts;
    setPosts((current) => current.filter((post) => post.id !== id));
    try {
      const response = await fetch(`/api/admin/forums/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to delete forum post.");
      setTotal((count) => Math.max(0, count - 1));
    } catch (err) {
      setPosts(previous);
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const onToggleFeatured = async (post: ForumPost) => {
    if (featureUpdatingId) return;
    setFeatureUpdatingId(post.id);
    setError(null);
    const nextFeatured = !post.is_featured;
    const previous = posts;
    setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, is_featured: nextFeatured } : item)));
    try {
      const response = await fetch(`/api/admin/forums/${encodeURIComponent(post.id)}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: nextFeatured }),
      });
      const json = (await response.json()) as { error?: string; post?: ForumPost };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update featured status.");
      if (json.post) {
        setPosts((current) => current.map((item) => (item.id === json.post?.id ? json.post : item)));
      }
    } catch (err) {
      setPosts(previous);
      setError(err instanceof Error ? err.message : "Failed to update featured status.");
    } finally {
      setFeatureUpdatingId(null);
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
        body: JSON.stringify({ target: "forums", limit: 20 }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "AutoPopulate failed.");
    } finally {
      setIsAutopopulating(false);
    }
  };

  const onGenerationComplete = (result: { created: number; skipped: number; failed: number }) => {
    if (result.created > 0) {
      setPage(1);
      setReloadTick((v) => v + 1);
    }
    setJobQueueTick((v) => v + 1);
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Forums</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Content</span>
            <Link
              href="/admin/blog"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Blogs
            </Link>
            <Link
              href="/admin/forums"
              className="rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium !text-white transition hover:bg-slate-800"
            >
              Forums
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">System</span>
            <Link
              href="/users"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Users
            </Link>
            <Link
              href="/admin/stats"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Analytics
            </Link>
            <Link
              href="/admin/comments?type=forum"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Moderate forum comments
            </Link>
          </div>
          <button
            type="button"
            onClick={onAutopopulate}
            disabled={isAutopopulating}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-violet-800 disabled:opacity-50"
          >
            {isAutopopulating ? "Populating..." : "AutoPopulate Content"}
          </button>
          <GenerateForumsButton onComplete={onGenerationComplete} />
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {autopopulateResult && (
        <p className="mb-4 rounded bg-violet-50 px-3 py-2 text-sm text-violet-700">
          AutoPopulate complete — {autopopulateResult}
        </p>
      )}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Generation Jobs</p>
        <JobQueuePanel refreshTick={jobQueueTick} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search by title…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        />
        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value as ForumFeedSort);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        >
          <option value="hot">Hot</option>
          <option value="new">New</option>
          <option value="top">Top</option>
          <option value="discussed">Most discussed</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => {
            setPage(1);
            setTagFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
        >
          <option value="all">All tags</option>
          {queryTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-slate-500">{total} posts</span>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          No forum posts found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Title</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Comments</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Views</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Tags</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className={post.is_featured ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3 text-sm text-slate-800">
                    <div className="flex items-center gap-2">
                      <Link href={`/forums/${post.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {post.title}
                      </Link>
                      {post.is_featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{formatCount(Math.round(post.score))}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{formatCount(post.comment_count)}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{formatCount(post.view_count)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {post.tags.length > 0 ? post.tags.join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatStableDate(post.created_at)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <ForumActions
                      isDeleting={deletingId === post.id}
                      isTogglingFeatured={featureUpdatingId === post.id}
                      isFeatured={post.is_featured}
                      onDelete={() => onDelete(post.id)}
                      onToggleFeatured={() => onToggleFeatured(post)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          disabled={page <= 1 || loading}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          disabled={page >= totalPages || loading}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
