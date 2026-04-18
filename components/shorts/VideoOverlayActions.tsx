"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { VideoPost } from "@/models/VideoPost";

type VideoOverlayActionsProps = {
  post: VideoPost;
  liked: boolean;
  muted: boolean;
  onLike: () => void;
  onMuteToggle: () => void;
  onShare: () => void;
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
  onShare,
}: VideoOverlayActionsProps) {
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

        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={onShare}
            aria-label="Share"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-xl shadow-lg backdrop-blur-md hover:bg-black/60"
          >
            🔗
          </motion.button>
          <span className="text-[11px] font-semibold text-white drop-shadow">Share</span>
        </div>

        {/* Mute toggle */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={onMuteToggle}
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
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
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
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
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
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
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
