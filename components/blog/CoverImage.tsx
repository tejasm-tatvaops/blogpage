"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCoverImageUrl } from "@/lib/coverImage";

type CoverImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  category?: string;
  tags?: string[];
};

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  category,
  tags,
}: CoverImageProps) {
  const generatedSrc = useMemo(
    () => buildCoverImageUrl({ title: alt, category, tags }),
    [alt, category, tags],
  );

  // Always start with the generated fallback so there's never a broken/blank
  // state. If an external src is provided, preload it silently and swap in
  // only after it has fully loaded.
  const [displaySrc, setDisplaySrc] = useState(generatedSrc);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setDisplaySrc(src);
    // on error we just keep the generated fallback — no state change needed
    return () => {
      img.onload = null;
    };
  }, [src]);

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
    />
  );
}
