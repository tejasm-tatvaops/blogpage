"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { VideoPost } from "@/models/VideoPost";

// ─── Dual-layer thumbnail renderer ────────────────────────────────────────────
//
// Low-res images (naturalWidth < 800px) — which includes YouTube's hqdefault
// (480px) and sddefault (640px) — must never be stretched to full screen.
//
// Pattern: blurred background fill (hides black bars) + centered contain
// foreground (sharp, no stretch). Same approach used by Instagram Reels.
//
// High-res images (≥ 800px, e.g. maxresdefault 1280px) use standard cover.

function InshortsThumbnail({
  src,
  alt,
  priority,
  onError,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  onError?: () => void;
}) {
  const [naturalW, setNaturalW] = useState<number | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Inshorts] ${alt}: ${w}×${img.naturalHeight}` +
          (w < 800 ? " → blur-contain" : " → cover"),
      );
    }
    setNaturalW(w);
  };

  const isLowRes = naturalW !== null && naturalW < 800;

  // Neutral initial render: probe dimensions without flashing stretched imagery.
  if (naturalW === null) {
    return (
      <>
        <Image
          src={src}
          alt=""
          fill
          quality={10}
          sizes="1px"
          aria-hidden
          className="pointer-events-none opacity-0"
          onLoad={handleLoad}
          onError={onError}
        />
        <div className="absolute inset-0 bg-black" />
      </>
    );
  }

  if (isLowRes) {
    return (
      <>
        {/* z-0 — blurred background fill, softer blur so it reads as intentional depth */}
        <Image
          src={src}
          alt=""
          fill
          quality={40}
          sizes="100vw"
          aria-hidden
          className="object-cover scale-100 blur-sm brightness-[0.75] opacity-70"
        />

        {/* z-10 — radial vignette to draw the eye to center */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(ellipse 75% 85% at 50% 50%, transparent 65%, rgba(0,0,0,0.4) 100%)",
          }}
        />

        {/* z-20 — centered foreground image, contrast/saturation boost + subtle scale */}
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="relative mx-auto my-auto h-[75%] w-[75%]">
            <Image
              src={src}
              alt={alt}
              fill
              quality={90}
              sizes="100vw"
              priority={priority}
              className="object-contain drop-shadow-2xl"
              style={{
                transform: "scale(1.02)",
                filter: "contrast(1.02) saturate(1.02)",
                outline: "1px solid rgba(255,255,255,0.04)",
              }}
              onError={onError}
            />
          </div>
        </div>
      </>
    );
  }

  // Confirmed high-res: full-screen cover.
  return (
    <Image
      src={src}
      alt={alt}
      fill
      quality={90}
      sizes="100vw"
      priority={priority}
      className="object-cover"
      onError={onError}
    />
  );
}

// ─── YouTube thumbnail with fallback chain ────────────────────────────────────
//
// Chain: maxresdefault (1280×720) → sddefault (640×480) → hqdefault (480×360)
//
// maxresdefault silently returns a 120×90 grey placeholder when unavailable
// (no HTTP error, so onError never fires). Detected by naturalWidth ≤ 120
// on load — advance the chain. Once a real frame is found, hand off to
// InshortsThumbnail for resolution-aware rendering.

function YouTubeThumbnail({
  videoId,
  alt,
  priority,
}: {
  videoId: string;
  alt: string;
  priority?: boolean;
}) {
  const chain = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ];

  const [idx, setIdx] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [gone, setGone] = useState(false);

  const src = chain[idx];

  const handlePlaceholderLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Inshorts] YT ${videoId} (${chain[idx].split("/").pop()}): ${w}×${e.currentTarget.naturalHeight}`,
      );
    }
    // 120×90 = YouTube "no thumbnail" grey placeholder — advance the chain
    if (w <= 120) {
      const next = idx + 1;
      if (next < chain.length) {
        setIdx(next);
      } else {
        setGone(true);
      }
      return;
    }
    // Real frame found — hand off to InshortsThumbnail for resolution rendering
    setResolved(true);
  };

  if (gone) return null;

  // While walking the chain, render an invisible probe image to fire onLoad
  if (!resolved) {
    return (
      <Image
        key={src}
        src={src}
        alt=""
        fill
        quality={10}
        sizes="1px"
        aria-hidden
        className="opacity-0 pointer-events-none"
        onLoad={handlePlaceholderLoad}
        onError={() => setGone(true)}
      />
    );
  }

  // Chain resolved — render with resolution-aware dual-layer logic
  return (
    <InshortsThumbnail
      src={src}
      alt={alt}
      priority={priority}
      onError={() => setGone(true)}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type VerticalVideoPlayerProps = {
  post: VideoPost;
  isActive: boolean;
  muted: boolean;
  hasInteracted: boolean;
  onFirstInteraction: () => void;
};

/**
 * Lazy YouTube / MP4 player.
 *
 * Rendering strategy — no memory leaks, no layout shifts:
 *   • Inactive card  → InshortsThumbnail (blur-contain or cover based on res)
 *   • Active card    → YouTube iframe or <video> element (unchanged)
 *   • isActive false → player removed, thumbnail reappears
 *
 * Mute state is owned by ShortsFeed and passed as a prop.
 */
export function VerticalVideoPlayer({
  post,
  isActive,
  muted,
  hasInteracted,
  onFirstInteraction,
}: VerticalVideoPlayerProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const thumbnail = thumbnailError ? null : post.thumbnailUrl;

  if (post.sourceType === "youtube" && post.youtubeVideoId) {
    const embedKey = `${post.youtubeVideoId}-${muted ? "m" : "u"}`;
    const embedSrc =
      `https://www.youtube.com/embed/${post.youtubeVideoId}` +
      `?autoplay=1&mute=${muted ? 1 : 0}&loop=1&rel=0&modestbranding=1&controls=1&playsinline=1&enablejsapi=1` +
      `&playlist=${post.youtubeVideoId}`;

    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {!isActive && (
          <YouTubeThumbnail videoId={post.youtubeVideoId} alt={post.title} />
        )}

        {isActive && (
          <iframe
            key={embedKey}
            src={embedSrc}
            title={post.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        )}

        {isActive && muted && (
          <button
            type="button"
            onClick={onFirstInteraction}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75"
            aria-label="Tap to unmute"
          >
            Tap for sound
          </button>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>
    );
  }

  // Uploaded / curated MP4
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const node = videoRef.current;
    if (!node || !isActive) return;

    node.volume = 1;
    node.muted = muted;
    if (process.env.NODE_ENV === "development") {
      console.log("shorts video state", { slug: post.slug, muted: node.muted, volume: node.volume });
    }
    const playPromise = node.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((err) => console.error("Play failed:", err));
    }
  }, [isActive, muted, post.slug]);

  if (post.videoUrl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        {isActive ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            autoPlay
            loop
            muted={muted}
            playsInline
            controls
            className="absolute inset-0 h-full w-full object-cover"
            onClick={onFirstInteraction}
          />
        ) : thumbnail ? (
          <InshortsThumbnail
            src={thumbnail}
            alt={post.title}
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-800" />
        )}

        {isActive && muted && !hasInteracted && (
          <button
            type="button"
            onClick={onFirstInteraction}
            className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75"
            aria-label="Tap to unmute"
          >
            Tap for sound
          </button>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>
    );
  }

  return null;
}
