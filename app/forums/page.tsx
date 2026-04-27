"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ForumList, ForumListSkeleton } from "@/components/forums/ForumList";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // Apply personalisation boost client-side for hot feed only
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

  const handleTagClick = (tag: string | null) => {
    if (tag) recordTagClick(tag);
    setActiveTag(tag === activeTag ? null : tag);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-8 sm:py-10 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-app sm:text-3xl">Forums</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discuss construction, share insights, ask questions.
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="mb-6 rounded-2xl border border-app bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:pb-0">
          {SORT_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm ${
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads..."
            className="w-full rounded-lg border border-app px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-500 transition focus:ring-2 sm:ml-auto sm:min-w-[220px] sm:py-1.5 sm:w-72"
          />
        </div>

        {activeTag && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Filtering by <span className="text-indigo-700">#{activeTag}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {loading ? (
            <ForumListSkeleton count={PAGE_SIZE} />
          ) : (
            <>
              {trendingPosts.length > 0 && (
                <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
                  <h3 className="mb-2 text-sm font-bold text-orange-800">Trending now</h3>
                  <div className="space-y-2">
                    {trendingPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/forums/${post.slug}`}
                        className="block rounded-lg bg-surface px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-100/40"
                      >
                        🔥 {post.title}
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
                    className="rounded-xl border border-app bg-surface px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-subtle disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-app bg-surface p-4 shadow-sm">
            <h3 className="text-sm font-bold text-app">Trending tags</h3>
            {topTags.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No tags yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-app bg-surface p-4 shadow-sm">
            <h3 className="text-sm font-bold text-app">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <Link href="/forums/new" className="block rounded-lg border border-app px-3 py-2 text-sm font-medium text-slate-700 hover:bg-subtle">
                Start a new thread
              </Link>
              <Link href="/blog" className="block rounded-lg border border-app px-3 py-2 text-sm font-medium text-slate-700 hover:bg-subtle">
                Read related blog posts
              </Link>
            </div>
          </div>
        </aside>
      </div>

    </main>
  );
}
