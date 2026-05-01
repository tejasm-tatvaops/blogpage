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
    <main className="min-h-screen w-full px-4 py-6 md:px-6">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Forums</h1>
          <p className="mt-0.5 text-sm text-muted">
            Discuss construction, share insights, ask questions.
          </p>
        </div>
        <Link
          href="/forums/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(234,88,12,0.35)] transition hover:from-orange-500 hover:to-orange-400 hover:shadow-[0_0_20px_rgba(234,88,12,0.5)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + New post
        </Link>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl glass-widget px-4 py-3">
        {/* Filter icon button */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-app px-3 py-1.5 text-sm font-medium text-muted transition hover:text-app hover:bg-subtle"
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
            className={[
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
              sort === value
                ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30 shadow-[0_0_10px_rgba(234,88,12,0.2)]"
                : "text-muted hover:text-app hover:bg-subtle",
            ].join(" ")}
          >
            {label}
          </button>
        ))}

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads…"
          className="ml-auto w-full min-w-[200px] rounded-lg border border-app bg-subtle px-3 py-1.5 text-sm text-app placeholder:text-faint outline-none transition focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 sm:w-64"
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* Thread feed */}
        <section>
          {loading ? (
            <ForumListSkeleton count={PAGE_SIZE} />
          ) : (
            <>
              {trendingPosts.length > 0 && (
                <section className="mb-5 rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-400">
                    🔥 Trending now
                  </h3>
                  <div className="space-y-1.5">
                    {trendingPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/forums/${post.slug}`}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-orange-500/8 hover:text-app"
                      >
                        {post.title}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

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
          <div className="rounded-2xl glass-widget p-4">
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
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
                      activeTag === tag
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                        : "border-app bg-subtle text-muted hover:bg-card hover:text-app",
                    ].join(" ")}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl glass-widget p-4">
            <h3 className="text-sm font-semibold text-heading">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <Link
                href="/forums/new"
                className="flex items-center justify-between rounded-xl border border-app bg-subtle px-3 py-2.5 text-sm text-muted transition hover:bg-card hover:text-app"
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
                className="flex items-center justify-between rounded-xl border border-app bg-subtle px-3 py-2.5 text-sm text-muted transition hover:bg-card hover:text-app"
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
            <div className="rounded-2xl glass-widget p-4">
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
    </main>
  );
}
