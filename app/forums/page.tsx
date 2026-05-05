"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES — all data fetching, state, hooks preserved exactly

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ForumListSkeleton } from "@/components/forums/ForumList";
import { ForumThreadFeed } from "@/components/forums/ForumThreadFeed";
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
  const [feedFocusedThread, setFeedFocusedThread] = useState<ForumPost | null>(null);
  const [sidebarPost, setSidebarPost] = useState<ForumPost | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarDisplayedIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { getOrCreateFingerprint(); }, []);

  useEffect(() => {
    if (loading) setFeedFocusedThread(null);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      sidebarDisplayedIdRef.current = null;
      setSidebarVisible(false);
      const t = window.setTimeout(() => setSidebarPost(null), 120);
      return () => clearTimeout(t);
    }

    const next = feedFocusedThread;
    if (!next) {
      sidebarDisplayedIdRef.current = null;
      setSidebarVisible(false);
      const t = window.setTimeout(() => setSidebarPost(null), 120);
      return () => clearTimeout(t);
    }

    if (sidebarDisplayedIdRef.current === next.id) return;

    const had = sidebarDisplayedIdRef.current !== null;

    const runEnter = () => {
      sidebarDisplayedIdRef.current = next.id;
      setSidebarPost(next);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSidebarVisible(true));
      });
    };

    if (!had) {
      setSidebarVisible(false);
      runEnter();
      return;
    }

    setSidebarVisible(false);
    const t = window.setTimeout(runEnter, 120);
    return () => clearTimeout(t);
  }, [loading, feedFocusedThread]);

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
    <main className="min-h-screen w-full">
      <div className="mr-auto max-w-[1100px] px-3 py-5 sm:px-4 sm:py-6">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-black dark:text-white sm:text-[32px]">Forums</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#64748b] dark:text-[#8b92a8]">
            Discuss construction, share insights, ask questions.
          </p>
        </div>
        <Link
          href="/forums/new"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_2px_12px_rgba(249,115,22,0.25)] transition hover:bg-orange-400 hover:shadow-[0_4px_16px_rgba(249,115,22,0.35)] sm:w-auto"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Post
        </Link>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {/* Filter icon button */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 transition hover:border-orange-300 hover:text-orange-600 dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/30 dark:hover:text-orange-400"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] transition ${
              sort === value
                ? "bg-orange-500 !text-white shadow-[0_0_10px_rgba(234,88,12,0.25)]"
                : "border border-black/10 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600 dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/30 dark:hover:text-orange-400"
            }`}
          >
            {label}
          </button>
        ))}

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads…"
          className="w-full rounded-xl border border-black/10 bg-white/85 px-3 py-1.5 text-[13px] text-black outline-none ring-orange-500/60 placeholder:text-slate-400 transition focus:ring-2 dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.6)] dark:text-[#f0f2ff] dark:placeholder:text-[#4d5470] sm:ml-auto sm:w-64"
        />

        {/* Active tag chip */}
        {activeTag && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#8b92a8]">#{activeTag}</span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="rounded-full border border-[#1e2440] bg-[#0d1128] px-2 py-0.5 text-[10px] text-[#8b92a8] transition hover:border-orange-500/30 hover:text-orange-400"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Content grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">

        {/* Thread feed */}
        <section>
          {loading ? (
            <ForumListSkeleton count={PAGE_SIZE} />
          ) : (
            <>
              <ForumThreadFeed posts={displayPosts} onActiveThreadChange={setFeedFocusedThread} />

              {page < totalPages && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-xl border border-black/10 bg-white px-6 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/30 dark:hover:text-orange-400"
                  >
                    {loadingMore ? "Loading…" : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-[80px] lg:self-start">
          {sidebarPost ? (
            <div
              className={[
                "rounded-2xl border border-orange-400/30 bg-orange-500/[0.06] p-4 shadow-sm transition-[opacity,transform] ease-out dark:border-orange-400/25 dark:bg-orange-500/[0.08]",
                sidebarVisible
                  ? "duration-[150ms] translate-y-0 opacity-100"
                  : "duration-[120ms] translate-y-1 opacity-0",
              ].join(" ")}
            >
              <p className="text-[0.54rem] font-bold uppercase leading-none tracking-wider text-orange-600 dark:text-orange-400">
                In view
              </p>
              <Link
                href={`/forums/${sidebarPost.slug}`}
                className="mt-2 line-clamp-3 block text-[0.88rem] font-semibold leading-tight text-app transition hover:text-orange-600 dark:hover:text-orange-400"
              >
                {sidebarPost.title}
              </Link>
              <p className="mt-1.5 line-clamp-2 text-[0.75rem] font-normal leading-[1.5] text-muted">
                {sidebarPost.excerpt}
              </p>
            </div>
          ) : null}

          {/* Trending tags */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
            <h3 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-heading">
              Trending tags
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400" aria-hidden>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </h3>
            {topTags.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-[#8b92a8]">No tags yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.05em] transition ${
                      activeTag === tag
                        ? "bg-orange-500 !text-white"
                        : "border border-black/10 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600 dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/30 dark:hover:text-orange-400"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
            <h3 className="text-[13.5px] font-semibold text-heading">Quick actions</h3>
            <div className="mt-3 space-y-1">
              <Link
                href="/forums/new"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-slate-500 transition hover:bg-black/5 dark:text-[#8b92a8] dark:hover:bg-[#141830]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>
                  Start a new thread
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4d5470]" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link
                href="/blog"
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-slate-500 transition hover:bg-black/5 dark:text-[#8b92a8] dark:hover:bg-[#141830]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1e2440] bg-[#141830] text-[#8b92a8]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" />
                    </svg>
                  </span>
                  Read related blog posts
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4d5470]" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Featured insight card */}
          {featuredInsight && (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-500">
                Featured Insight
              </p>
              <h4 className="text-[14px] font-bold leading-snug text-heading">
                {featuredInsight.title}
              </h4>
              <Link
                href={`/forums/${featuredInsight.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-500 transition hover:text-orange-400"
              >
                Read more →
              </Link>
            </div>
          )}

        </aside>
      </div>

      <button
        type="button"
        className="fixed bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.4)] transition hover:scale-105 hover:bg-orange-400 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12"
        aria-label="Quick action"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m12 2 2.45 4.97L20 7.8l-4 3.9.94 5.5L12 14.9l-4.94 2.6.94-5.5-4-3.9 5.55-.83L12 2Z" />
        </svg>
      </button>
      </div>
    </main>
  );
}
