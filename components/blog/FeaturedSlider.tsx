"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlogPost } from "@/lib/blogService";
import { CoverImage } from "./CoverImage";

type FeaturedSliderProps = {
  blogs: BlogPost[];
  autoSlideMs?: number;
};

const SWIPE_THRESHOLD_PX = 50;
const FEATURED_LOCAL_POOL = [
  "/images/construction/site-1.jpg",
  "/images/construction/site-2.jpg",
  "/images/construction/site-3.jpg",
  "/images/construction/site-4.jpg",
  "/images/construction/site-5.png",
  "/images/construction/site-6.png",
  "/images/construction/site-7.png",
  "/images/construction/tower-1.png",
  "/images/construction/highrise-1.png",
];
const sanitizeFeaturedImageSource = (value?: string | null): string => {
  const src = (value ?? "").trim().toLowerCase();
  if (!src) return "";
  if (src.startsWith("/api/cover-image")) return "";
  if (src.includes("placeholder") || src.includes("gradient") || src.includes("blog-placeholder")) return "";
  return value?.trim() ?? "";
};

export function FeaturedSlider({ blogs, autoSlideMs = 4500 }: FeaturedSliderProps) {
  const slides = useMemo(() => blogs.slice(0, 5), [blogs]);
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = slides.length;

  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const interval = window.setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, autoSlideMs);
    return () => window.clearInterval(interval);
  }, [autoSlideMs, isHovered, total]);

  useEffect(() => {
    if (active > total - 1) setActive(0);
  }, [active, total]);

  const goPrev = () => setActive((prev) => (prev - 1 + total) % total);
  const goNext = () => setActive((prev) => (prev + 1) % total);

  if (total === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 pt-10">
      <div
        className="relative overflow-hidden rounded-3xl border border-app bg-slate-950 shadow-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current;
          const endX = e.changedTouches[0]?.clientX ?? null;
          if (startX == null || endX == null) return;
          const dx = endX - startX;
          if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
          if (dx > 0) goPrev();
          else goNext();
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((blog, idx) => (
            <article key={blog.id} className="relative min-w-full">
              <Link href={`/blog/${blog.slug}`} className="block">
                <div className="relative aspect-[16/9] w-full">
                  <CoverImage
                    src={sanitizeFeaturedImageSource(blog.cover_image)}
                    slug={blog.slug}
                    alt={blog.title}
                    className="object-cover"
                    disablePlaceholderFallback
                    fallbackSources={FEATURED_LOCAL_POOL}
                    sizes="(max-width: 1280px) 100vw, 1200px"
                    priority={idx === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <p className="mb-2 inline-flex rounded-full bg-surface/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur">
                      Featured
                    </p>
                    <h2 className="max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                      {blog.title}
                    </h2>
                    <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-white/85 sm:text-base">
                      {blog.excerpt}
                    </p>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous featured post"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2.5 text-white shadow-lg shadow-black/50 backdrop-blur transition hover:bg-black/65 hover:shadow-xl hover:shadow-black/60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next featured post"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2.5 text-white shadow-lg shadow-black/50 backdrop-blur transition hover:bg-black/65 hover:shadow-xl hover:shadow-black/60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {slides.map((blog, idx) => (
                <button
                  key={blog.id}
                  type="button"
                  aria-label={`Go to featured slide ${idx + 1}`}
                  onClick={() => setActive(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === active ? "w-8 bg-surface" : "w-2.5 bg-surface/50 hover:bg-surface/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
