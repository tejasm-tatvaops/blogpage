"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";

type SwipeModeProps = {
  posts: ForumPost[];
  onClose: () => void;
};

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

export function SwipeMode({ posts, onClose }: SwipeModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") scrollTo(activeIndex + 1);
      if (e.key === "ArrowUp") scrollTo(activeIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Prevent body scroll while swipe mode is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Track active slide via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const slides = Array.from(container.querySelectorAll("[data-slide]"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slides.indexOf(entry.target);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [posts]);

  const scrollTo = (index: number) => {
    const clamped = Math.max(0, Math.min(posts.length - 1, index));
    const container = containerRef.current;
    if (!container) return;
    const slide = container.querySelector(`[data-slide="${clamped}"]`);
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="text-sm font-semibold text-white/70">
          {activeIndex + 1} / {posts.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit swipe mode"
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {posts.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to post ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Slides container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}
      >
        {posts.map((post, i) => (
          <div
            key={post.id}
            data-slide={i}
            className="flex h-screen flex-col items-center justify-center px-4 py-20 md:px-8"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="w-full max-w-[1500px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#070b2a] via-[#060a25] to-[#030617] shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.6fr]">
                <div className="p-6 sm:p-8 md:p-12">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="mb-5 flex flex-wrap gap-2">
                      {post.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="mb-7 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                    {post.excerpt}
                  </p>

                  {/* Stats row */}
                  <div className="mb-8 flex flex-wrap items-center gap-5 text-sm text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-indigo-400">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                      <span className="font-semibold text-white">{formatCount(post.upvote_count)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {formatCount(post.comment_count)} replies
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {formatCount(post.view_count)} views
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/forums/${post.slug}`}
                      className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-semibold !text-white transition hover:bg-indigo-500 sm:text-base"
                    >
                      Read full post →
                    </Link>
                    <button
                      type="button"
                      onClick={() => scrollTo(i + 1)}
                      disabled={i === posts.length - 1}
                      className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-30 sm:text-base"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-black/20 p-6 md:border-l md:border-t-0 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Thread info</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Author</span>
                      <span className="font-medium text-white">{post.author_name}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Score</span>
                      <span className="font-medium text-white">{formatCount(post.upvote_count - post.downvote_count)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>Replies</span>
                      <span className="font-medium text-white">{formatCount(post.comment_count)}</span>
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-slate-500">
                    Swipe/scroll to move to the next card. Press <span className="text-slate-300">Esc</span> to close.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
