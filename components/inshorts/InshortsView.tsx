"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import * as twitterChannel from "@/channels/twitterChannel";
import * as linkedinChannel from "@/channels/linkedinChannel";
import * as whatsappChannel from "@/channels/whatsappChannel";
import * as instagramChannel from "@/channels/instagramChannel";
import type { ContentPayload } from "@/channels/shared";

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

const readingMinutes = (post: BlogPost): number =>
  Math.max(1, Math.ceil((post.word_count ?? 0) / 200));

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
  "/images/construction/tower-1.png",
  "/images/construction/city-crane-1.png",
  "/images/construction/highrise-1.png",
  "/images/construction/concrete-mix-1.png",
  "/images/construction/brick-stack-1.png",
  "/images/construction/house-shell-1.png",
  "/images/construction/modern-house-1.png",
  "/images/construction/commercial-frame-1.png",
];

const gradientForPost = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length]!;
};

const fallbackImageForPost = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 37 + id.charCodeAt(i)) >>> 0;
  return constructionImages[hash % constructionImages.length]!;
};

const candidateImageForPost = (post: BlogPost): string =>
  post.cover_image || fallbackImageForPost(post.id);

const shortText = (post: BlogPost): string => {
  const source = (post.excerpt || post.content || "").replace(/\s+/g, " ").trim();
  const tagLine = [post.category, ...post.tags].slice(0, 2).join(" & ");
  const fallback = `Quick read on ${tagLine || "construction"}.`;
  const base = source || fallback;
  const baseText = base.split(" ").filter(Boolean).slice(0, 52).join(" ");
  const cta = "Tap 'Read full article' to explore the complete guide on TatvaOps.";
  return `${baseText}${baseText.endsWith(".") ? "" : "."} ${cta}`
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 95)
    .join(" ");
};

const toneForPost = (post: BlogPost): string => {
  const signal = `${post.title} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
  if (signal.includes("design") || signal.includes("interior"))
    return "from-indigo-500/20 via-transparent to-transparent";
  if (signal.includes("cost") || signal.includes("budget") || signal.includes("estimation"))
    return "from-amber-500/20 via-transparent to-transparent";
  if (signal.includes("material") || signal.includes("concrete") || signal.includes("boq"))
    return "from-emerald-500/20 via-transparent to-transparent";
  return "from-sky-500/20 via-transparent to-transparent";
};

const isNewPost = (post: BlogPost): boolean =>
  Date.now() - new Date(post.created_at).getTime() < 3 * 24 * 60 * 60 * 1000;

const navLinks = [
  { label: "Home",          href: "/" },
  { label: "Blogs",         href: "/blog" },
  { label: "Forums",        href: "/forums" },
  { label: "Shorts",        href: "/shorts" },
  { label: "Tatva Inshorts",href: "/inshorts", active: true },
  { label: "Tutorials",     href: "/tutorials" },
  { label: "Ask AI",        href: "/ask", highlight: true },
  { label: "Saved",         href: "/saved" },
  { label: "Admin",         href: "/admin/login" },
];

type InshortsViewProps = {
  initialPosts: BlogPost[];
};

export function InshortsView({ initialPosts }: InshortsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const touchStartAtRef = useRef(0);
  const touchMovedRef = useRef(0);
  const interactionDepthRef = useRef<"low" | "medium" | "high">("low");
  const dwellStartedAtRef = useRef(Date.now());
  const lastTrackedIndexRef = useRef(0);

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGestureHint, setShowGestureHint] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [swipeGlow, setSwipeGlow] = useState(false);
  const [igCopiedPostId, setIgCopiedPostId] = useState<string | null>(null);
  const [validatedImageByPostId, setValidatedImageByPostId] = useState<Record<string, string | null>>({});

  // Load posts client-side if SSR didn't provide any
  useEffect(() => {
    if (initialPosts.length > 0) return;
    setLoading(true);
    fetch("/api/blog/feed?limit=50")
      .then((r) => r.json() as Promise<{ posts: BlogPost[] }>)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, posts.length]);

  // Lock body scroll while inshorts is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Dismiss gesture hint after 2.8s
  useEffect(() => {
    const timer = window.setTimeout(() => setShowGestureHint(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  // Prefetch next card image
  useEffect(() => {
    const next = posts[activeIndex + 1];
    if (!next) return;
    const img = new Image();
    img.src = candidateImageForPost(next);
  }, [activeIndex, posts]);

  // Validate image quality — reject anything below 700px wide
  useEffect(() => {
    const unresolved = posts
      .map((post) => ({ postId: post.id, src: candidateImageForPost(post) }))
      .filter(({ postId }) => !(postId in validatedImageByPostId));
    if (unresolved.length === 0) return;

    for (const { postId, src } of unresolved) {
      const img = new Image();
      img.onload = () => {
        const valid = img.naturalWidth >= 700;
        setValidatedImageByPostId((prev) => ({ ...prev, [postId]: valid ? src : null }));
      };
      img.onerror = () => {
        setValidatedImageByPostId((prev) => ({ ...prev, [postId]: null }));
      };
      img.src = src;
    }
  }, [posts, validatedImageByPostId]);

  // IntersectionObserver — track which slide is active
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

  const emitFeedEvent = (eventType: "dwell_time" | "skip", post: BlogPost, dwellMs?: number) => {
    void fetch("/api/feed/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        postSlug: post.slug,
        tags: post.tags,
        category: post.category,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, posts]);

  useEffect(() => {
    return () => {
      const current = posts[lastTrackedIndexRef.current];
      if (!current) return;
      emitFeedEvent("dwell_time", current, Math.max(0, Date.now() - dwellStartedAtRef.current));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  const progressPct = posts.length > 1 ? ((activeIndex + 1) / posts.length) * 100 : 100;
  const progressComplete = progressPct >= 100;
  const topTags = [...new Set(posts.flatMap((p) => [p.category, ...p.tags]).filter(Boolean))].slice(0, 12);
  const activePost = posts[activeIndex];
  const interestSignal = activePost?.category ?? activePost?.tags[0] ?? "construction";
  const visibleDotStart = Math.max(0, activeIndex - 4);
  const visibleDots = posts.slice(visibleDotStart, visibleDotStart + 9);

  const easingPool: [number, number, number, number][] = [
    [0.16, 1, 0.3, 1],
    [0.22, 1, 0.36, 1],
    [0.2, 0.95, 0.25, 1],
  ];
  const transitionEase = easingPool[activeIndex % easingPool.length]!;

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
          <Link href="/blog" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            Read Articles
          </Link>
          <Link href="/forums" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            Browse Forums
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
          <div className="mb-2 flex items-center gap-2">
            {/* Left: back + title */}
            <div className="flex flex-shrink-0 items-center gap-3">
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

            {/* Right: full nav — scrollable, matches navbar links */}
            <div className="flex min-w-0 flex-1 justify-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1">
                {navLinks.map((link) =>
                  link.active ? (
                    <span
                      key={link.href}
                      className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black"
                    >
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:text-white ${
                        link.highlight
                          ? "bg-indigo-600/80 text-white hover:bg-indigo-500"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
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
            <span className="whitespace-nowrap rounded-full border border-sky-300 bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
              All
            </span>
            {topTags.map((tag) => (
              <span
                key={tag}
                className="whitespace-nowrap rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm transition hover:bg-black/50"
              >
                #{tag}
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
        {posts.map((post, i) => {
          const articleUrl = typeof window !== "undefined"
            ? `${window.location.origin}/blog/${post.slug}`
            : `/blog/${post.slug}`;

          const payload: ContentPayload = {
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            tags: post.tags,
            category: post.category,
          };

          const trackShare = (channel: string) => {
            fetch(`/api/blog/${encodeURIComponent(post.slug)}/share`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ channel }),
            }).catch(() => undefined);
          };

          const shareTwitter = () => { twitterChannel.share(payload, articleUrl); trackShare("twitter"); };
          const shareLinkedIn = () => { linkedinChannel.share(payload, articleUrl); trackShare("linkedin"); };
          const shareWhatsApp = () => { whatsappChannel.share(payload, articleUrl); trackShare("whatsapp"); };
          const shareInstagram = async () => {
            const usedNative = await instagramChannel.share(
              { ...payload, imageUrl: post.cover_image ?? null },
              articleUrl,
            );
            trackShare("instagram");
            if (!usedNative) {
              setIgCopiedPostId(post.id);
              window.setTimeout(() => setIgCopiedPostId(null), 2500);
            }
          };

          return (
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
                  style={{
                    backgroundImage: validatedImageByPostId[post.id]
                      ? `url(${validatedImageByPostId[post.id]})`
                      : undefined,
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${toneForPost(post)} transition duration-500`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

                  {/* Title shown when no validated image */}
                  {!validatedImageByPostId[post.id] && (
                    <div className="absolute inset-0 z-[1] flex items-center justify-center px-8 text-center">
                      <span className="line-clamp-3 text-lg font-semibold text-white/95">{post.title}</span>
                    </div>
                  )}

                  {/* Side actions */}
                  <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-3">
                    {/* Social share icons row */}
                    <div
                      className="flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-2 backdrop-blur-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* WhatsApp */}
                      <button
                        type="button"
                        aria-label="Share on WhatsApp"
                        onClick={shareWhatsApp}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#25D366]/70"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </button>

                      {/* Twitter / X */}
                      <button
                        type="button"
                        aria-label="Share on X (Twitter)"
                        onClick={shareTwitter}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-black/60"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </button>

                      {/* LinkedIn */}
                      <button
                        type="button"
                        aria-label="Share on LinkedIn"
                        onClick={shareLinkedIn}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#0A66C2]/70"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </button>

                      {/* Instagram — native share on mobile, caption copy + open instagram.com on desktop */}
                      <button
                        type="button"
                        aria-label={igCopiedPostId === post.id ? "Caption copied — paste into Instagram!" : "Share on Instagram"}
                        title={igCopiedPostId === post.id ? "Caption copied — paste into Instagram!" : "Share on Instagram"}
                        onClick={(e) => { e.stopPropagation(); void shareInstagram(); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-gradient-to-br hover:from-[#f09433]/70 hover:via-[#e6683c]/70 hover:to-[#bc1888]/70"
                      >
                        {igCopiedPostId === post.id ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="2" y="2" width="20" height="20" rx="5" />
                            <circle cx="12" cy="12" r="4" />
                            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Read button */}
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold backdrop-blur-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPost(post);
                      }}
                    >
                      📖 Read
                    </motion.button>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-10 sm:p-6">
                    {/* Badges */}
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {(post.view_count >= 80 || post.upvote_count >= 12) && (
                        <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold">🔥 Popular</span>
                      )}
                      {isNewPost(post) && (
                        <span className="rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold">✨ New</span>
                      )}
                    </div>

                    {/* Category pill */}
                    <div className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                      {post.category}
                    </div>

                    {/* Title */}
                    <motion.h2
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: 0.02 }}
                      className="text-2xl font-extrabold leading-tight sm:text-3xl"
                    >
                      {post.title}
                    </motion.h2>

                    {/* Excerpt */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: 0.14 }}
                      className="mt-2 line-clamp-4 max-w-xl text-sm leading-7 text-white/90 sm:text-base"
                    >
                      {shortText(post)}
                    </motion.p>

                    {/* Stats */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/80 sm:text-sm">
                      <span>{formatCount(post.view_count)} views</span>
                      <span>{readingMinutes(post)} min read</span>
                      <span>{formatRelativeTime(post.created_at)} ago</span>
                    </div>

                    {/* CTA — links to blog article */}
                    <a
                      href={`/blog/${post.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/25"
                    >
                      Read full article →
                    </a>
                  </div>
                </motion.article>
              )}
            </div>
          );
        })}
      </div>

      {/* Dot progress */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {visibleDots.map((_, offset) => {
            const idx = visibleDotStart + offset;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={`Go to post ${idx + 1}`}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${idx === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/35"}`}
              />
            );
          })}
        </div>
        {showGestureHint && (
          <p className="rounded-full bg-black/35 px-3 py-1 text-[11px] text-white/85 backdrop-blur-md">
            Swipe left or right to continue
          </p>
        )}
      </div>

      {/* Article detail overlay */}
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                  {selectedPost.category}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/blog/${selectedPost.slug}`}
                    className="rounded-full bg-sky-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                  >
                    Open full article →
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

              {/* Author + meta */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span className="font-medium text-white/70">{selectedPost.author}</span>
                <span>·</span>
                <span>{readingMinutes(selectedPost)} min read</span>
                <span>·</span>
                <span>{formatCount(selectedPost.view_count)} views</span>
              </div>

              <h3 className="text-2xl font-bold leading-tight">{selectedPost.title}</h3>

              {/* Tags */}
              {selectedPost.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPost.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-4 text-sm leading-7 text-white/85">
                {selectedPost.excerpt || selectedPost.content?.slice(0, 600)}
              </p>

              <a
                href={`/blog/${selectedPost.slug}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Read the full article →
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
