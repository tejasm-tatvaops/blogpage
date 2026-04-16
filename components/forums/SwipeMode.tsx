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
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-4">
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
            className="flex h-screen flex-col items-center justify-center px-6 py-20"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="w-full max-w-lg">
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
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
              <h2 className="mb-4 text-2xl font-bold leading-tight text-white sm:text-3xl">
                {post.title}
              </h2>

              {/* Excerpt */}
              <p className="mb-6 text-base leading-7 text-slate-300/80 line-clamp-4">
                {post.excerpt}
              </p>

              {/* Stats row */}
              <div className="mb-8 flex items-center gap-5 text-sm text-slate-400">
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
                <span className="ml-auto text-xs">{post.author_name}</span>
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <Link
                  href={`/forums/${post.slug}`}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold !text-white transition hover:bg-indigo-500"
                >
                  Read full post →
                </Link>
                <button
                  type="button"
                  onClick={() => scrollTo(i + 1)}
                  disabled={i === posts.length - 1}
                  className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
