"use client";

import { useMemo, useState } from "react";
import { DEFAULT_BLOG_COVER_IMAGE } from "@/lib/coverImage";

type CoverImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackLabel?: string;
};

const shortLabel = (value: string): string => {
  const text = value.trim();
  if (!text) return "Blog cover";
  return text.length > 70 ? `${text.slice(0, 70).trim()}...` : text;
};

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  fallbackLabel,
}: CoverImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_BLOG_COVER_IMAGE);
  const [usedFallback, setUsedFallback] = useState(!src);
  const label = useMemo(() => shortLabel(fallbackLabel ?? alt), [fallbackLabel, alt]);

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        onError={() => {
          if (currentSrc !== DEFAULT_BLOG_COVER_IMAGE) {
            setCurrentSrc(DEFAULT_BLOG_COVER_IMAGE);
            setUsedFallback(true);
            return;
          }
          setUsedFallback(true);
        }}
        referrerPolicy="no-referrer"
      />
      {usedFallback && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent" />
      )}
      {usedFallback && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-sm">
          {label}
        </div>
      )}
    </>
  );
}
