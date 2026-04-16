"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ForumList, ForumListSkeleton } from "@/components/forums/ForumList";
import { SwipeMode } from "@/components/forums/SwipeMode";
import type { ForumPost, ForumFeedSort } from "@/lib/forumService";
import {
  applyPersonalisationBoost,
  getOrCreateFingerprint,
  recordTagClick,
} from "@/lib/personalization";

const SORT_OPTIONS: { value: ForumFeedSort; label: string; icon: string }[] = [
  { value: "hot", label: "Trending", icon: "🔥" },
  { value: "new", label: "Latest", icon: "🆕" },
  { value: "top", label: "Top", icon: "⬆️" },
  { value: "discussed", label: "Most Discussed", icon: "💬" },
];

const PAGE_SIZE = 20;

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [sort, setSort] = useState<ForumFeedSort>("hot");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [swipeMode, setSwipeMode] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Establish fingerprint identity on first mount
  useEffect(() => { getOrCreateFingerprint(); }, []);

  const fetchPosts = useCallback(
    async (nextSort: ForumFeedSort, nextPage: number, tag: string | null, append: boolean) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          sort: nextSort,
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });
        if (tag) params.set("tag", tag);

        const res = await fetch(`/api/forums?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = (await res.json()) as {
          posts: ForumPost[];
          totalPages: number;
        };

        setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
        setTotalPages(data.totalPages);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Reload when sort or tag changes
  useEffect(() => {
    setPage(1);
    void fetchPosts(sort, 1, activeTag, false);
  }, [sort, activeTag, fetchPosts]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPosts(sort, nextPage, activeTag, true);
  };

  // All unique tags from current posts for quick filtering
  const allTags = [...new Set(posts.flatMap((p) => p.tags))].slice(0, 20);

  // Apply personalisation boost client-side for hot feed only
  const displayPosts = sort === "hot" ? applyPersonalisationBoost(posts) : posts;

  const handleTagClick = (tag: string | null) => {
    if (tag) recordTagClick(tag);
    setActiveTag(tag === activeTag ? null : tag);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Forums</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discuss construction, share insights, ask questions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSwipeMode(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            title="Swipe mode — browse posts one by one"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="3" width="20" height="18" rx="3" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            Swipe
          </button>
          <Link
            href="/forums/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-indigo-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New post
          </Link>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SORT_OPTIONS.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              sort === value
                ? "bg-slate-900 !text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span aria-hidden>{icon} </span>
            {label}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              !activeTag
                ? "bg-indigo-600 !text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                activeTag === tag
                  ? "bg-indigo-600 !text-white"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <ForumListSkeleton count={PAGE_SIZE} />
      ) : (
        <>
          <ForumList posts={displayPosts} />

          {page < totalPages && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Swipe overlay */}
      {swipeMode && posts.length > 0 && (
        <SwipeMode posts={posts} onClose={() => setSwipeMode(false)} />
      )}
    </main>
  );
}
