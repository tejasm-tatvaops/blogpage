"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LEGACY_BLOG_COVER_IMAGE, DEFAULT_BLOG_COVER_IMAGE, buildCoverImageUrl } from "@/lib/coverImage";

type CoverImageProps = {
  src: string;
  slug?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  category?: string;
  tags?: string[];
  fallbackSources?: string[];
  disablePlaceholderFallback?: boolean;
  debugId?: string;
};

const LOCAL_SAFE_IMAGE_POOL = [
  "/images/construction/site-1.jpg",
  "/images/construction/site-2.jpg",
  "/images/construction/site-3.jpg",
  "/images/construction/site-4.jpg",
];

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const isLocalImagePath = (value: string): boolean => value.startsWith("/images/");
const isBlockedRemoteSource = (value: string): boolean => value.includes("source.unsplash.com");
const isLikelyUsableImageSource = (value: string): boolean => {
  const v = value.trim();
  if (!v) return false;
  if (isBlockedRemoteSource(v)) return false;
  if (v.startsWith("/images/")) return true;
  if (v.startsWith("/api/cover-image")) return true;
  if (v.startsWith("data:image/")) return true;
  if (v.startsWith("https://") || v.startsWith("http://")) return true;
  return false;
};

const getDeterministicImage = (slug: string): string => {
  const pool = LOCAL_SAFE_IMAGE_POOL.length > 0 ? LOCAL_SAFE_IMAGE_POOL : ["/images/blog-default.svg"];
  const index = Math.abs(hashForIndex(slug || "blog-card")) % pool.length;
  return pool[index];
};

export function CoverImage({
  src,
  slug = "",
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  category,
  tags,
  fallbackSources = [],
  disablePlaceholderFallback = false,
  debugId,
}: CoverImageProps) {
  const generatedSrc = useMemo(
    () => buildCoverImageUrl({ title: alt, category, tags }),
    [alt, category, tags],
  );
  const sourceChain = useMemo(() => {
    if (disablePlaceholderFallback) {
      const sanitizedFallbacks = fallbackSources
        .map((value) => value.trim())
        .filter((value) => isLocalImagePath(value) && isLikelyUsableImageSource(value));
      const deterministic = getDeterministicImage(slug || alt);
      const candidate = typeof src === "string" ? src.trim() : "";
      const primary = isLikelyUsableImageSource(candidate) ? candidate : deterministic;
      const chain = [primary, ...sanitizedFallbacks, deterministic].filter(Boolean) as string[];
      return chain.length > 0 ? chain : [deterministic];
    }
    return [src?.trim(), generatedSrc, DEFAULT_BLOG_COVER_IMAGE, LEGACY_BLOG_COVER_IMAGE]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter((value) => isLikelyUsableImageSource(value)) as string[];
  }, [alt, disablePlaceholderFallback, fallbackSources, generatedSrc, slug, src]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceChain]);

  const displaySrc = sourceChain[sourceIndex] ?? LEGACY_BLOG_COVER_IMAGE;
  const isDataUrl = displaySrc.startsWith("data:image/");
  const isSvgSrc = displaySrc.includes(".svg") || displaySrc.startsWith("/api/cover-image");

  useEffect(() => {
    if (!debugId) return;
    // Useful during card tuning to confirm which source wins.
    console.log(`[CoverImage:${debugId}] Final image src: ${displaySrc}`);
  }, [debugId, displaySrc]);

  return (
    <Image
      key={displaySrc}
      src={displaySrc}
      alt={alt}
      fill
      className={`absolute inset-0 ${className}`}
      sizes={sizes}
      priority={priority}
      unoptimized={isDataUrl || isSvgSrc}
      onError={() =>
        setSourceIndex((current) => (current < sourceChain.length - 1 ? current + 1 : current))
      }
    />
  );
}
