"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { VideoPost } from "@/models/VideoPost";

type VideoOverlayActionsProps = {
  post: VideoPost;
  liked: boolean;
  muted: boolean;
  onLike: () => void;
  onMuteToggle: () => void;
  onFirstInteraction: () => void;
};

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

/** Source badge: YouTube red pill vs TatvaOps brand pill */
function SourceBadge({ sourceType }: { sourceType: VideoPost["sourceType"] }) {
  if (sourceType === "youtube") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {/* YouTube play icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.14 12.14 0 00-1.82-3.35A4.84 4.84 0 0112 .12a4.84 4.84 0 01-2-.13 12.14 12.14 0 00-1.82 3.35A4.83 4.83 0 014.41 6.69C2.2 7.65.57 9.96.07 12.6S.3 18 2.18 19.8A6.16 6.16 0 007 22.5c1.3 0 2.5-.42 3.5-1.13l1.5 1.13 1.5-1.13A6.16 6.16 0 0018 22.5a6.16 6.16 0 004.82-2.7C24.7 18 24.93 15.24 24.43 12.6s-2.13-4.95-4.84-5.91z" />
        </svg>
        YouTube
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-700/80 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
      TatvaOps
    </span>
  );
}

export function VideoOverlayActions({
  post,
  liked,
  muted,
  onLike,
  onMuteToggle,
  onFirstInteraction,
}: VideoOverlayActionsProps) {
  const [igCopied, setIgCopied] = useState(false);
  const shortUrl = typeof window !== "undefined"
    ? `${window.location.origin}/shorts/${post.slug}`
    : `/shorts/${post.slug}`;
  const cleanCaption = post.shortCaption?.trim() || "Check out this short video on TatvaOps.";
  const hashtags = post.tags
    .filter(Boolean)
    .slice(0, 4)
    .map((tag) => `#${tag.replace(/\s+/g, "")}`)
    .join(" ");
  const shareText = `${post.title}\n\n${cleanCaption}\n\nWatch this short on TatvaOps: ${shortUrl}${hashtags ? `\n\n${hashtags}` : ""}`;

  const trackShare = (channel: string) => {
    void fetch(`/api/shorts/${encodeURIComponent(post.slug)}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    }).catch(() => undefined);
  };

  const openShareWindow = (url: string) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer,width=720,height=760");
  };

  const shareTwitter = () => {
    openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`);
    trackShare("twitter");
  };
  const shareLinkedIn = () => {
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortUrl)}`);
    trackShare("linkedin");
  };
  const shareWhatsApp = () => {
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
    trackShare("whatsapp");
  };
  const shareThreads = () => {
    openShareWindow(`https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`);
    trackShare("threads");
  };
  const shareInstagram = async () => {
    let usedNative = false;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: shortUrl,
        });
        usedNative = true;
      }
    } catch {
      usedNative = false;
    }
    trackShare("instagram");
    if (!usedNative) {
      void navigator.clipboard?.writeText(shareText).catch(() => undefined);
      setIgCopied(true);
      window.setTimeout(() => setIgCopied(false), 2500);
      openShareWindow("https://www.instagram.com/");
    }
  };

  return (
    <>
      {/* ── Right-side action column ── */}
      <div className="absolute bottom-32 right-3 z-20 flex flex-col items-center gap-4">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            animate={liked ? { scale: [1, 1.3, 0.9, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={onLike}
            aria-label={liked ? "Unlike" : "Like"}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg backdrop-blur-md transition ${
              liked ? "bg-pink-500/90" : "bg-black/40 hover:bg-black/60"
            }`}
          >
            {liked ? "❤️" : "🤍"}
          </motion.button>
          <span className="text-[11px] font-semibold text-white drop-shadow">
            {formatCount(liked ? post.likes + 1 : post.likes)}
          </span>
        </div>

        {/* Social share stack */}
        <div
          className="flex flex-col items-center gap-1.5 rounded-full bg-black/35 px-2 py-2 backdrop-blur-md"
          onClick={(event) => event.stopPropagation()}
        >
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
          <button
            type="button"
            aria-label="Share on Threads"
            onClick={shareThreads}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/30"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M16.35 11.08c-.12-2.46-1.55-3.86-4.03-3.95h-.13c-1.43 0-2.58.46-3.43 1.36-.8.86-1.24 2.02-1.24 3.3 0 2.69 1.78 4.58 4.32 4.58 2.03 0 3.54-1.16 3.86-2.94.05-.26.08-.53.08-.8 0-.04 0-.08-.01-.12.49.3.83.71 1 1.23.2.63.1 1.29-.29 1.88-.54.82-1.56 1.31-2.72 1.31-2.09 0-3.62-1.3-3.98-3.4-.04-.24-.25-.4-.5-.36-.24.04-.4.26-.36.5.43 2.56 2.39 4.16 4.84 4.16 1.45 0 2.74-.63 3.44-1.69.53-.81.67-1.73.4-2.61-.31-1-.98-1.72-1.95-2.1-.06-.78-.18-1.47-.34-1.95ZM12 14.8c-1.5 0-2.55-1.14-2.55-2.77 0-.99.33-1.87.92-2.47.51-.52 1.2-.79 2.05-.79h.1c1.59.05 2.4.84 2.48 2.43-1.3.06-2.3.3-3.07.74-.96.55-1.42 1.39-1.42 2.57 0 .1.01.2.02.29-.17.01-.34.02-.53.02Zm2.61-1.63c-.2 1.1-1.12 1.78-2.4 1.78-.96 0-1.67-.58-1.67-1.37 0-.89.31-1.43 1-1.83.64-.36 1.53-.57 2.73-.62.02.19.03.39.03.59 0 .49-.03.97-.09 1.45Z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={igCopied ? "Caption copied - paste into Instagram!" : "Share on Instagram"}
            title={igCopied ? "Caption copied - paste into Instagram!" : "Share on Instagram"}
            onClick={(event) => {
              event.stopPropagation();
              void shareInstagram();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-gradient-to-br hover:from-[#f09433]/70 hover:via-[#e6683c]/70 hover:to-[#bc1888]/70"
          >
            {igCopied ? (
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

        {/* Mute toggle */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            if (muted) {
              onFirstInteraction();
            } else {
              onMuteToggle();
            }
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-lg shadow-lg backdrop-blur-md hover:bg-black/60"
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* ── Bottom overlay: caption + metadata + CTA ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-8 pt-16 sm:px-5">
        {/* Source badge + tag */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SourceBadge sourceType={post.sourceType} />
          {post.tags[0] && (
            <span className="rounded-full bg-surface/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
              {post.tags[0]}
            </span>
          )}
          {post.durationSeconds && (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
              {Math.floor(post.durationSeconds / 60)}:{String(post.durationSeconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Short caption — Inshorts style */}
        <p className="line-clamp-3 max-w-[85%] text-sm font-medium leading-relaxed text-white drop-shadow-sm sm:text-base">
          {post.shortCaption}
        </p>

        {/* Stats row */}
        <div className="mt-2 flex items-center gap-4 text-xs text-white/70">
          <span>{formatCount(post.views)} views</span>
          <span>{formatCount(post.likes)} likes</span>
        </div>

        {/* Read full article CTA — only if there's a linked blog post */}
        {post.linkedBlogSlug && (
          <Link
            href={`/blog/${post.linkedBlogSlug}`}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-surface/25"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="3" width="12" height="1.5" rx=".75" fill="currentColor" opacity=".9" />
              <rect x="2" y="6.5" width="9" height="1.5" rx=".75" fill="currentColor" opacity=".6" />
              <rect x="2" y="10" width="10" height="1.5" rx=".75" fill="currentColor" opacity=".6" />
            </svg>
            Read full article
          </Link>
        )}
        {post.linkedForumSlug && !post.linkedBlogSlug && (
          <Link
            href={`/forums/${post.linkedForumSlug}`}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-surface/25"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            </svg>
            Join the discussion
          </Link>
        )}
      </div>
    </>
  );
}
