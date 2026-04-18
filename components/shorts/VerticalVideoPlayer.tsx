"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { VideoPost } from "@/models/VideoPost";

type VerticalVideoPlayerProps = {
  post: VideoPost;
  isActive: boolean;
  muted: boolean;
};

/**
 * Lazy YouTube / MP4 player.
 *
 * Rendering strategy — no memory leaks, no layout shifts:
 *   • Inactive card  → thumbnail <Image>, no iframe loaded
 *   • Active card    → YouTube iframe (autoplay, muted per prop)
 *   • isActive false → iframe removed, thumbnail reappears
 *
 * Mute state is owned by ShortsFeed and passed as a prop.
 * Changing `muted` while active re-mounts the iframe with the new param
 * via a key change — simplest correct approach without IFrame API.
 */
export function VerticalVideoPlayer({ post, isActive, muted }: VerticalVideoPlayerProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  // Track mount to avoid flash of thumbnail after first activation
  const everActivated = useRef(false);
  if (isActive) everActivated.current = true;

  const thumbnail = thumbnailError ? null : post.thumbnailUrl;

  if (post.sourceType === "youtube" && post.youtubeVideoId) {
    const embedKey = `${post.youtubeVideoId}-${muted ? "m" : "u"}`;
    const embedSrc =
      `https://www.youtube.com/embed/${post.youtubeVideoId}` +
      `?autoplay=1&mute=${muted ? 1 : 0}&loop=1&rel=0&modestbranding=1&controls=0` +
      `&playlist=${post.youtubeVideoId}`;

    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {/* Thumbnail — shown while inactive */}
        {!isActive && thumbnail && (
          <Image
            src={thumbnail}
            alt={post.title}
            fill
            className="object-cover opacity-80"
            onError={() => setThumbnailError(true)}
            sizes="100vw"
          />
        )}
        {!isActive && !thumbnail && (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-800" />
        )}

        {/* YouTube iframe — only mounted when active */}
        {isActive && (
          <iframe
            key={embedKey}
            src={embedSrc}
            title={post.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Dark gradient overlay to ensure text readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>
    );
  }

  // Uploaded / curated MP4
  if (post.videoUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {isActive ? (
          <video
            src={post.videoUrl}
            autoPlay
            loop
            muted={muted}
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          thumbnail ? (
            <Image
              src={thumbnail}
              alt={post.title}
              fill
              className="object-cover opacity-80"
              onError={() => setThumbnailError(true)}
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-800" />
          )
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>
    );
  }

  return null;
}
