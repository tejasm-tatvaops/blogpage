"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ForumFeedSort, ForumPost } from "@/lib/forumService";
import { GenerateForumsButton } from "./GenerateForumsButton";
import { JobQueuePanel } from "./JobQueuePanel";
import { PostInspector } from "./PostInspector";

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

const fmt = (value: number): string => new Intl.NumberFormat("en-US").format(value);

const ScoreDot = ({ value }: { value: number }) => {
  const color =
    value >= 0.7 ? "bg-emerald-500" : value >= 0.4 ? "bg-amber-500" : "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="tabular-nums">{value.toFixed(2)}</span>
    </span>
  );
};

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
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

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
        if (response.status === 401) { router.push("/admin/login"); return; }
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
    if (selectedPost?.id === id) setSelectedPost(null);
    try {
      const response = await fetch(`/api/admin/forums/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) { router.push("/admin/login"); return; }
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
    if (selectedPost?.id === post.id) setSelectedPost((p) => p ? { ...p, is_featured: nextFeatured } : p);
    try {
      const response = await fetch(`/api/admin/forums/${encodeURIComponent(post.id)}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: nextFeatured }),
      });
      const json = (await response.json()) as { error?: string; post?: ForumPost };
      if (response.status === 401) { router.push("/admin/login"); return; }
      if (!response.ok) throw new Error(json.error ?? "Failed to update featured status.");
      if (json.post) {
        setPosts((current) => current.map((item) => (item.id === json.post?.id ? json.post : item)));
        if (selectedPost?.id === json.post.id) setSelectedPost(json.post);
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
        `${json.postsProcessed ?? 0} posts · ${json.commentsCreated ?? 0} comments · ${json.repliesCreated ?? 0} replies`,
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
    <div className="flex h-full min-h-0">
      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Forums</h1>
            <p className="text-sm text-slate-500">{total} posts total</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAutopopulate}
              disabled={isAutopopulating}
              className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
            >
              {isAutopopulating ? "Populating…" : "AutoPopulate"}
            </button>
            <GenerateForumsButton onComplete={onGenerationComplete} />
          </div>
        </div>

        {/* Error / result banners */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {autopopulateResult && (
          <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
            AutoPopulate complete — {autopopulateResult}
          </div>
        )}

        {/* Job queue */}
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Generation jobs
          </p>
          <JobQueuePanel refreshTick={jobQueueTick} />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by title…"
            className="w-full max-w-xs rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={sort}
            onChange={(e) => { setPage(1); setSort(e.target.value as ForumFeedSort); }}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-500"
          >
            <option value="hot">Hot</option>
            <option value="new">New</option>
            <option value="top">Top</option>
            <option value="discussed">Most discussed</option>
          </select>
          <select
            value={tagFilter}
            onChange={(e) => { setPage(1); setTagFilter(e.target.value); }}
            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All tags</option>
            {queryTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
            No forum posts found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quality</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comments</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Views</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tags</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {posts.map((post) => {
                  const isSelected = selectedPost?.id === post.id;
                  return (
                    <tr
                      key={post.id}
                      onClick={() => setSelectedPost(isSelected ? null : post)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-violet-50"
                          : post.is_featured
                          ? "bg-amber-50 hover:bg-amber-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="line-clamp-1 max-w-[340px]">{post.title}</span>
                          {post.is_featured && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Featured
                            </span>
                          )}
                          {post.badges.length > 0 && (
                            <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                              {post.badges[0]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        <ScoreDot value={post.quality_score} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fmt(post.comment_count)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fmt(post.view_count)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{post.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-500">{formatStableDate(post.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={page <= 1 || loading}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">
              {page} / {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Inspector panel */}
      {selectedPost && (
        <PostInspector
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={onDelete}
          onToggleFeatured={onToggleFeatured}
          isDeletingId={deletingId}
          isFeatureUpdatingId={featureUpdatingId}
        />
      )}
    </div>
  );
}
