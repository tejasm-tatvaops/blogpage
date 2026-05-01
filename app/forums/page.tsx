"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES — all data fetching, state, hooks preserved exactly

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ForumList, ForumListSkeleton } from "@/components/forums/ForumList";
import type { ForumPost, ForumFeedSort } from "@/lib/forumService";
import {
  applyPersonalisationBoost,
  getOrCreateFingerprint,
  recordTagClick,
} from "@/lib/personalization";

const SORT_OPTIONS: { value: ForumFeedSort; label: string }[] = [
  { value: "hot",       label: "Trending" },
  { value: "new",       label: "Latest" },
  { value: "top",       label: "Top" },
  { value: "discussed", label: "Most Discussed" },
];

const PAGE_SIZE = 20;

export default function ForumsPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [sort, setSort] = useState<ForumFeedSort>("hot");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        const data = (await res.json()) as { posts: ForumPost[]; totalPages: number };

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

  const displayPostsBase = sort === "hot" ? applyPersonalisationBoost(posts) : posts;
  const query = search.trim().toLowerCase();
  const displayPosts = query
    ? displayPostsBase.filter((post) => {
        const signal = `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase();
        return signal.includes(query);
      })
    : displayPostsBase;
  const trendingPosts = displayPosts.filter((post) => post.is_trending).slice(0, 3);
  const topTags = [...new Set(displayPosts.flatMap((p) => p.tags))].slice(0, 10);
  const featuredInsight = trendingPosts[0] ?? null;

  const handleTagClick = (tag: string | null) => {
    if (tag) recordTagClick(tag);
    setActiveTag(tag === activeTag ? null : tag);
  };

  return (
    <main className="min-h-screen w-full pl-[110px]">
      <div className="max-w-[1100px] mx-auto px-4 py-6">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Forums</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
            Discuss construction, share insights, ask questions.
          </p>
        </div>
        <Link
          href="/forums/new"
          className="bg-orange-500 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition inline-flex items-center gap-1.5 text-sm font-semibold"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + New post
        </Link>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Filter icon button */}
        <button
          type="button"
          className="px-3 py-1 rounded-full text-gray-500 hover:text-orange-500 transition text-sm flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </button>

        {/* Sort tabs */}
        {SORT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            className={sort === value
              ? "px-3 py-1 rounded-full bg-orange-500 text-white text-sm font-medium"
              : "px-3 py-1 rounded-full text-gray-500 hover:text-orange-500 transition text-sm"}
          >
            {label}
          </button>
        ))}

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads…"
          className="ml-auto w-full min-w-[200px] rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] px-3 py-1.5 text-sm text-black dark:text-white placeholder:text-gray-400 outline-none transition focus:border-orange-400 sm:w-64"
        />

        {/* Active tag chip */}
        {activeTag && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-faint">#{activeTag}</span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="rounded-full bg-subtle px-2.5 py-0.5 text-xs text-muted transition hover:bg-card hover:text-app"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Content grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* Thread feed */}
        <section>
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
                    className="rounded-xl border border-app bg-subtle px-6 py-2.5 text-sm font-medium text-muted transition hover:bg-card hover:text-app disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-[80px] lg:self-start">

          {/* Trending tags */}
          <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-heading">
              Trending tags
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400" aria-hidden>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </h3>
            {topTags.length === 0 ? (
              <p className="mt-2 text-xs text-faint">No tags yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={[
                      "px-2 py-1 text-xs rounded-full transition",
                      activeTag === tag
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60",
                    ].join(" ")}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-semibold text-heading">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <Link
                href="/forums/new"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-500 dark:text-white/70 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>
                  Start a new thread
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link
                href="/blog"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-500 dark:text-white/70 transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-app bg-subtle text-muted">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" />
                    </svg>
                  </span>
                  Read related blog posts
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Featured insight card */}
          {featuredInsight && (
            <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Featured Insight
              </p>
              <h4 className="text-sm font-bold leading-snug text-heading">
                {featuredInsight.title}
              </h4>
              <Link
                href={`/forums/${featuredInsight.slug}`}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-app bg-subtle px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-card hover:text-app"
              >
                Read more →
              </Link>
            </div>
          )}

        </aside>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition"
        aria-label="Quick action"
      >
        ★
      </button>
      </div>
    </main>
  );
}
