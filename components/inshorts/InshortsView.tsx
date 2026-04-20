"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const formatRelativeTime = (value: string): string => {
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return "now";
  const diff = Date.now() - created;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const gradients = [
  "from-slate-950 via-indigo-950 to-slate-900",
  "from-zinc-950 via-blue-950 to-slate-900",
  "from-neutral-950 via-purple-950 to-slate-900",
  "from-slate-950 via-cyan-950 to-slate-900",
  "from-stone-950 via-fuchsia-950 to-slate-900",
];

const constructionImages = [
  "/images/construction/site-1.jpg",
  "/images/construction/site-2.jpg",
  "/images/construction/site-3.jpg",
  "/images/construction/site-4.jpg",
  "/images/construction/site-5.png",
  "/images/construction/site-6.png",
  "/images/construction/site-7.png",
  "/images/construction/foundation-1.png",
  "/images/construction/tower-1.png",
  "/images/construction/city-crane-1.png",
  "/images/construction/highrise-1.png",
  "/images/construction/concrete-mix-1.png",
  "/images/construction/brick-stack-1.png",
  "/images/construction/house-shell-1.png",
  "/images/construction/modern-house-1.png",
  "/images/construction/commercial-frame-1.png",
  "/images/construction/user-added-1.png",
  "/images/construction/user-added-2.png",
  "/images/construction/user-added-3.png",
  "/images/construction/user-added-4.png",
  "/images/construction/user-added-5.png",
  "/images/construction/user-added-6.png",
  "/images/construction/user-added-7.png",
  "/images/construction/user-added-8.png",
  "/images/construction/user-added-9.png",
  "/images/construction/user-added-10.png",
  "/images/construction/user-added-11.png",
  "/images/construction/user-added-12.png",
  "/images/construction/user-added-13.png",
  "/images/construction/user-added-14.png",
];

const gradientForPost = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
};

const imageForPost = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 37 + id.charCodeAt(i)) >>> 0;
  return constructionImages[hash % constructionImages.length];
};

const shortText = (post: ForumPost): string => {
  const source = (post.excerpt || post.content || "").replace(/\s+/g, " ").trim();
  if (!source) return "Practical construction discussion from the community.";
  return source.split(" ").slice(0, 110).join(" ");
};

const toneForPost = (post: ForumPost): string => {
  const signal = `${post.title} ${post.tags.join(" ")}`.toLowerCase();
  if (signal.includes("design") || signal.includes("interior")) return "from-indigo-500/20 via-transparent to-transparent";
  if (signal.includes("cost") || signal.includes("budget")) return "from-amber-500/20 via-transparent to-transparent";
  if (signal.includes("material") || signal.includes("concrete")) return "from-emerald-500/20 via-transparent to-transparent";
  return "from-sky-500/20 via-transparent to-transparent";
};

type InshortsViewProps = {
  initialPosts: ForumPost[];
};

export function InshortsView({ initialPosts }: InshortsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const touchStartAtRef = useRef(0);
  const touchMovedRef = useRef(0);
  const interactionDepthRef = useRef<"low" | "medium" | "high">("low");
  const dwellStartedAtRef = useRef(Date.now());
  const lastTrackedIndexRef = useRef(0);

  const [posts, setPosts] = useState<ForumPost[]>(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGestureHint, setShowGestureHint] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});
  const [swipeGlow, setSwipeGlow] = useState(false);
  const [interactionAck, setInteractionAck] = useState(false);

  // Load posts if not provided server-side
  useEffect(() => {
    if (initialPosts.length > 0) return;
    setLoading(true);
    fetch("/api/forums?sort=hot&limit=50")
      .then((r) => r.json() as Promise<{ posts: ForumPost[] }>)
      .then(({ posts: fetched }) => setPosts(fetched ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [initialPosts.length]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") scrollTo(activeIndex + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") scrollTo(activeIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, posts.length]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowGestureHint(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const next = posts[activeIndex + 1];
    if (!next) return;
    const img = new Image();
    img.src = imageForPost(next.id);
  }, [activeIndex, posts]);

  // IntersectionObserver to track active slide
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

  const scrollTo = (index: number, behavior: ScrollBehavior = "smooth") => {
    const clamped = Math.max(0, Math.min(posts.length - 1, index));
    const container = containerRef.current;
    if (!container) return;
    container.querySelector(`[data-slide="${clamped}"]`)?.scrollIntoView({ behavior, block: "nearest", inline: "start" });
  };

  const emitFeedEvent = (
    eventType: "dwell_time" | "skip",
    post: ForumPost,
    dwellMs?: number,
  ) => {
    void fetch("/api/feed/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        postSlug: post.slug,
        tags: post.tags,
        dwellMs,
        interactionDepth: interactionDepthRef.current,
      }),
    }).catch(() => undefined);
  };

  const commitDwell = (fromIndex: number, toIndex: number) => {
    const prev = posts[fromIndex];
    if (!prev) return;
    const dwellMs = Math.max(0, Date.now() - dwellStartedAtRef.current);
    emitFeedEvent("dwell_time", prev, dwellMs);
    if (toIndex !== fromIndex && dwellMs < 5000) emitFeedEvent("skip", prev, dwellMs);
    dwellStartedAtRef.current = Date.now();
  };

  useEffect(() => {
    if (lastTrackedIndexRef.current === activeIndex) return;
    commitDwell(lastTrackedIndexRef.current, activeIndex);
    lastTrackedIndexRef.current = activeIndex;
  }, [activeIndex, posts]);

  useEffect(() => {
    return () => {
      const current = posts[lastTrackedIndexRef.current];
      if (!current) return;
      emitFeedEvent("dwell_time", current, Math.max(0, Date.now() - dwellStartedAtRef.current));
    };
  }, [posts]);

  const progressPct = posts.length > 1 ? ((activeIndex + 1) / posts.length) * 100 : 100;
  const progressComplete = progressPct >= 100;
  const topTags = [...new Set(posts.flatMap((p) => p.tags).filter(Boolean))].slice(0, 12);
  const activePost = posts[activeIndex];
  const interestSignal = activePost?.tags[0] ?? "construction";
  const visibleDotStart = Math.max(0, activeIndex - 4);
  const visibleDots = posts.slice(visibleDotStart, visibleDotStart + 9);

  const easingPool: [number, number, number, number][] = [
    [0.16, 1, 0.3, 1],
    [0.22, 1, 0.36, 1],
    [0.2, 0.95, 0.25, 1],
  ];
  const transitionEase = easingPool[activeIndex % easingPool.length];

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="mt-4 text-sm text-white/50">Loading Tatva Inshorts…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white">
        <p className="text-lg font-semibold text-white/60">No insights available yet.</p>
        <p className="mt-2 text-sm text-white/40">Check back soon — content is added regularly.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/forums" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            Browse Forums
          </Link>
          <Link href="/blog" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            Read Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-10 h-screen w-screen bg-black text-white"
      animate={{ scale: selectedPost ? 0.985 : 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <AnimatePresence>
        {swipeGlow && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ background: "radial-gradient(circle at center, rgba(125,211,252,0.45), transparent 55%)" }}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20">
        <div className="pointer-events-auto sticky top-0 bg-black/20 px-3 pt-2 backdrop-blur-lg">
          {/* Progress bar */}
          <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-white/85"
              animate={{
                width: `${progressPct}%`,
                boxShadow: progressComplete
                  ? "0 0 14px rgba(255,255,255,0.9), 0 0 24px rgba(96,165,250,0.75)"
                  : "0 0 0 rgba(255,255,255,0)",
              }}
              transition={{ duration: 0.34, ease: transitionEase }}
            />
          </div>

          {/* Header row */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </Link>
              <div>
                <span className="text-sm font-bold tracking-wide text-white">Tatva Inshorts</span>
                <span className="ml-2 text-xs text-white/50">{activeIndex + 1}/{posts.length}</span>
              </div>
            </div>
            {/* Cross-content chips */}
            <div className="flex items-center gap-1.5">
              <Link href="/blog"   className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white">Articles</Link>
              <Link href="/forums" className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white">Forums</Link>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Inshorts</span>
            </div>
          </div>

          {/* Personalisation signal */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`${activeIndex}-${interestSignal}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mb-2 text-[11px] font-medium text-white/85"
            >
              Because you like <span className="font-semibold text-white">{interestSignal}</span>
            </motion.p>
          </AnimatePresence>

          {/* Topic chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">All</span>
            {topTags.map((tag) => (
              <span key={tag} className="whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal scroll card strip */}
      <div
        ref={containerRef}
        className="h-screen whitespace-nowrap overflow-x-scroll overflow-y-hidden snap-x snap-mandatory px-2 pb-2 pt-[7.5rem] [scroll-behavior:smooth]"
        style={{ scrollbarWidth: "none" }}
        onTouchStart={(event) => {
          const point = event.touches[0];
          touchStartXRef.current = point?.clientX ?? 0;
          touchStartAtRef.current = Date.now();
          touchMovedRef.current = 0;
          interactionDepthRef.current = "low";
        }}
        onTouchMove={(event) => {
          const point = event.touches[0];
          const move = Math.abs((point?.clientX ?? 0) - touchStartXRef.current);
          touchMovedRef.current = Math.max(touchMovedRef.current, move);
          if (touchMovedRef.current > 35) interactionDepthRef.current = "medium";
        }}
        onTouchEnd={(event) => {
          const point = event.changedTouches[0];
          const dx = (point?.clientX ?? 0) - touchStartXRef.current;
          const dt = Math.max(1, Date.now() - touchStartAtRef.current);
          const velocity = Math.abs(dx) / dt;
          const fastSwipe = velocity > 0.95 && Math.abs(dx) > 35;
          const committedSwipe = Math.abs(dx) > 90;
          if (fastSwipe || committedSwipe) {
            interactionDepthRef.current = fastSwipe ? "high" : "medium";
            setSwipeGlow(true);
            window.setTimeout(() => setSwipeGlow(false), 260);
            scrollTo(activeIndex + (dx < 0 ? 1 : -1), fastSwipe ? "auto" : "smooth");
            return;
          }
          scrollTo(activeIndex, "smooth");
        }}
      >
        {posts.map((post, i) => (
          <div
            key={post.id}
            data-slide={i}
            className="mr-3 inline-block h-[calc(100vh-8rem)] w-[calc(100vw-2.75rem)] align-top snap-center"
          >
            {Math.abs(i - activeIndex) > 1 ? (
              <div className="h-full w-full bg-black" />
            ) : (
              <motion.article
                initial={{ opacity: 0.82, scale: 0.985, y: 18 }}
                animate={{
                  opacity: i === activeIndex ? 1 : 0.8,
                  scale: i === activeIndex ? 1 : 0.986,
                  y: i === activeIndex ? 0 : 5,
                }}
                transition={{
                  duration: i === activeIndex ? 0.32 : 0.42,
                  ease: transitionEase,
                }}
                onClick={() => setSelectedPost(post)}
                layoutId={`inshorts-card-${post.id}`}
                className={`relative h-full w-full overflow-hidden whitespace-normal rounded-2xl bg-gradient-to-br ${gradientForPost(post.id)} bg-cover bg-center bg-no-repeat`}
                style={{ backgroundImage: `url(${imageForPost(post.id)})` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${toneForPost(post)} transition duration-500`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Side actions */}
                <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    animate={likedById[post.id] ? { scale: [1, 1.24, 0.96, 1] } : { scale: 1 }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    className={`rounded-full px-3 py-2 text-xs font-semibold backdrop-blur-md ${
                      likedById[post.id] ? "bg-pink-500/80" : "bg-black/35"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      interactionDepthRef.current = "high";
                      setInteractionAck(true);
                      window.setTimeout(() => setInteractionAck(false), 500);
                      setLikedById((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                    }}
                  >
                    👍 {formatCount(post.upvote_count)}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    💬 {formatCount(post.comment_count)}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold backdrop-blur-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof navigator !== "undefined" && navigator.share) {
                        void navigator.share({
                          title: post.title,
                          text: shortText(post).split(" ").slice(0, 45).join(" "),
                          url: `${window.location.origin}/forums/${post.slug}`,
                        }).catch(() => undefined);
                      }
                    }}
                  >
                    🔗 Share
                  </motion.button>
                </div>

                {/* Bottom content */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-10 sm:p-6">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {(post.view_count >= 80 || post.upvote_count >= 12) && (
                      <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold">🔥 Popular</span>
                    )}
                    {post.comment_count >= 6 && (
                      <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold">💬 Active</span>
                    )}
                  </div>
                  <div className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {post.tags[0] ?? "discussion"}
                  </div>
                  <motion.h2
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: 0.02 }}
                    className="text-2xl font-extrabold leading-tight sm:text-3xl"
                  >
                    {post.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: 0.14 }}
                    className="mt-2 line-clamp-6 max-w-3xl text-sm leading-6 text-white/90 sm:text-base"
                  >
                    {shortText(post)}
                  </motion.p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/80 sm:text-sm">
                    <span>{formatCount(post.view_count)} views</span>
                    <span>{formatCount(post.comment_count)} replies</span>
                    <span>{formatRelativeTime(post.created_at)} ago</span>
                  </div>
                  {/* Discuss in forum deep-link */}
                  <a
                    href={`/forums/${post.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/25"
                  >
                    Discuss in Forums →
                  </a>
                </div>
              </motion.article>
            )}
          </div>
        ))}
      </div>

      {/* Dot progress */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {visibleDots.map((_, offset) => {
            const i = visibleDotStart + offset;
            return (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to post ${i + 1}`}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/35"}`}
              />
            );
          })}
        </div>
        <AnimatePresence>
          {interactionAck && (
            <motion.p
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mb-2 rounded-full bg-emerald-500/80 px-3 py-1 text-[11px] font-semibold text-white"
            >
              Interaction saved
            </motion.p>
          )}
        </AnimatePresence>
        {showGestureHint && (
          <p className="rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
            Swipe left or right to continue
          </p>
        )}
      </div>

      {/* Post detail overlay */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              layoutId={`inshorts-card-${selectedPost.id}`}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-4 bottom-6 top-24 overflow-auto rounded-2xl border border-white/15 bg-zinc-950/90 p-5 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                  {selectedPost.tags[0] ?? "discussion"}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/forums/${selectedPost.slug}`}
                    className="rounded-full bg-indigo-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Open in Forums →
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/90 hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
              <h3 className="text-2xl font-bold leading-tight">{selectedPost.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/85">{selectedPost.content || selectedPost.excerpt}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
