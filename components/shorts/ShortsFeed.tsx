"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { VideoPost } from "@/models/VideoPost";
import { ShortSlide } from "./ShortSlide";
import { ShortsTopBar } from "./ShortsTopBar";
import { ShortsPage } from "./ShortsPage";

type ShortsFeedProps = {
  initialPosts: VideoPost[];
};

// ─── Feed event helper ────────────────────────────────────────────────────────
// Reuses the existing /api/feed/events endpoint so video signals flow into
// the same FeedEvent collection and analytics pipeline as blogs/forums.

function emitFeedEvent(
  eventType: "dwell_time" | "skip",
  post: VideoPost,
  dwellMs: number,
) {
  void fetch("/api/feed/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      postSlug: post.slug,
      tags: post.tags,
      dwellMs,
      interactionDepth: dwellMs > 15_000 ? "high" : dwellMs > 5_000 ? "medium" : "low",
      metadata: { contentType: "video", sourceType: post.sourceType },
    }),
  }).catch(() => undefined);
}

// ─── View tracking ────────────────────────────────────────────────────────────

function trackView(slug: string) {
  void fetch(`/api/shorts/${slug}/view`, { method: "POST" }).catch(() => undefined);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShortsFeed({ initialPosts }: ShortsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dwellStartRef = useRef(Date.now());
  const lastIndexRef = useRef(0);
  const viewTrackedRef = useRef(new Set<string>());

  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});
  const [posts, setPosts] = useState<VideoPost[]>(initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 20);
  const [showGestureHint, setShowGestureHint] = useState(true);
  const [interactionAck, setInteractionAck] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Hide gesture hint after 3 s
  useEffect(() => {
    const t = window.setTimeout(() => setShowGestureHint(false), 3000);
    return () => window.clearTimeout(t);
  }, []);

  // Lock body scroll while Shorts feed is mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") scrollToIndex(activeIndex + 1);
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  scrollToIndex(activeIndex - 1);
      if (e.key === "m" || e.key === "M") setMuted((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex]);

  // Intersection observer — vertical snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const slides = Array.from(container.querySelectorAll("[data-slide]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slides.indexOf(entry.target);
            if (idx !== -1 && idx !== lastIndexRef.current) {
              setActiveIndex(idx);
            }
          }
        }
      },
      { root: container, threshold: 0.65 },
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [posts]);

  // Dwell tracking on card change
  useEffect(() => {
    const prev = posts[lastIndexRef.current];
    if (!prev || lastIndexRef.current === activeIndex) return;

    const dwellMs = Math.max(0, Date.now() - dwellStartRef.current);
    emitFeedEvent("dwell_time", prev, dwellMs);
    if (dwellMs < 5_000) emitFeedEvent("skip", prev, dwellMs);

    dwellStartRef.current = Date.now();
    lastIndexRef.current = activeIndex;
  }, [activeIndex, posts]);

  // Track view on first activation
  useEffect(() => {
    const post = posts[activeIndex];
    if (!post) return;
    if (!viewTrackedRef.current.has(post.slug)) {
      viewTrackedRef.current.add(post.slug);
      trackView(post.slug);
    }
  }, [activeIndex, posts]);

  // Flush dwell on unmount
  useEffect(() => {
    return () => {
      const post = posts[lastIndexRef.current];
      if (!post) return;
      const dwellMs = Math.max(0, Date.now() - dwellStartRef.current);
      emitFeedEvent("dwell_time", post, dwellMs);
    };
  }, [posts]);

  // Preload next thumbnail
  useEffect(() => {
    const next = posts[activeIndex + 1];
    if (!next?.thumbnailUrl) return;
    const img = new Image();
    img.src = next.thumbnailUrl;
  }, [activeIndex, posts]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const clamped = Math.max(0, Math.min(posts.length - 1, index));
    const container = containerRef.current;
    if (!container) return;
    const slide = container.querySelector(`[data-slide="${clamped}"]`);
    slide?.scrollIntoView({ behavior, block: "start" });
  }, [posts.length]);

  // Infinite scroll: load more when near end
  useEffect(() => {
    if (activeIndex < posts.length - 3) return;
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = Math.ceil(posts.length / 20) + 1;
    void fetch(`/api/shorts?sort=hot&page=${nextPage}&limit=20`)
      .then((r) => r.json() as Promise<{ posts: VideoPost[]; total: number }>)
      .then(({ posts: newPosts, total }) => {
        setPosts((prev) => {
          const existingSlugs = new Set(prev.map((p) => p.slug));
          const fresh = newPosts.filter((p) => !existingSlugs.has(p.slug));
          return [...prev, ...fresh];
        });
        setHasMore(posts.length + newPosts.length < total);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [activeIndex, posts.length, loadingMore, hasMore]);

  const handleLike = useCallback((slug: string) => {
    const isLiked = likedById[slug];
    setLikedById((prev) => ({ ...prev, [slug]: !isLiked }));
    setInteractionAck(isLiked ? null : "❤️ Liked");
    window.setTimeout(() => setInteractionAck(null), 1500);
    void fetch(`/api/shorts/${slug}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: isLiked ? "unlike" : "like" }),
    }).catch(() => undefined);
  }, [likedById]);

  const handleFirstInteraction = useCallback(() => {
    if (hasInteracted) return;
    setHasInteracted(true);
    setMuted(false);
    setInteractionAck("Sound on");
    window.setTimeout(() => setInteractionAck(null), 1200);
  }, [hasInteracted]);

  if (posts.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white">
        <p className="text-lg font-semibold text-white/60">No shorts available yet.</p>
        <p className="mt-2 text-sm text-white/40">Check back soon — content is added regularly.</p>
        <Link href="/blog" className="mt-6 rounded-full bg-surface/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-surface/20">
          Browse articles instead
        </Link>
      </div>
    );
  }

  return (
    <ShortsPage
      topBar={<ShortsTopBar activeIndex={activeIndex} total={posts.length} />}
      feed={(
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {posts.map((post, i) => (
            <ShortSlide
              key={post.id}
              post={post}
              index={i}
              isActive={i === activeIndex}
              muted={muted}
              hasInteracted={hasInteracted}
              liked={!!likedById[post.slug]}
              onLike={handleLike}
              onMuteToggle={() => setMuted((v) => !v)}
              onFirstInteraction={handleFirstInteraction}
            />
          ))}

          {loadingMore && (
            <div className="flex h-24 w-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
        </div>
      )}
      dots={(
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 md:left-[calc(50%+64px)]">
          <div className="flex items-center gap-1.5">
            {posts.slice(Math.max(0, activeIndex - 4), activeIndex + 5).map((_, offset) => {
              const i = Math.max(0, activeIndex - 4) + offset;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToIndex(i)}
                  className={`pointer-events-auto rounded-full transition-all ${
                    i === activeIndex ? "h-5 w-1.5 bg-surface" : "h-1.5 w-1.5 bg-surface/35"
                  }`}
                  aria-label={`Go to video ${i + 1}`}
                />
              );
            })}
          </div>
        </div>
      )}
      overlays={(
        <>
          <AnimatePresence>
            {showGestureHint && (
              <motion.div
                className="pointer-events-none fixed bottom-14 left-1/2 z-30 -translate-x-1/2 md:left-[calc(50%+64px)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <span className="rounded-full bg-black/40 px-4 py-1.5 text-xs text-white/80 backdrop-blur-md">
                  Scroll or swipe up to continue
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {interactionAck && (
              <motion.div
                key={interactionAck}
                className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 md:left-[calc(50%+64px)]"
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <span className="rounded-full bg-emerald-500/90 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm shadow-lg">
                  {interactionAck}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    />
  );
}
