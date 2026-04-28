"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const FALLBACK_IMAGES = [
  "/images/construction/site-1.jpg",
  "/images/construction/house-1.jpg",
  "/images/construction/foundation-1.png",
  "/images/construction/site-2.jpg",
  "/images/construction/house-shell-1.png",
  "/images/construction/site-3.jpg",
];

type Tutorial = {
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image?: string | null;
  difficulty?: string;
  estimated_minutes?: number;
  interactive_blocks?: unknown[];
};

export default function ContinueLearningCarousel({ tutorials }: { tutorials: Tutorial[] }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset skeleton whenever the active slide changes
  useEffect(() => {
    setImgLoaded(false);
  }, [active]);

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setActive(idx);
      setVisible(true);
    }, 320);
  }, []);

  useEffect(() => {
    if (tutorials.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % tutorials.length);
        setVisible(true);
      }, 320);
    }, 4500);
    return () => clearInterval(id);
  }, [tutorials.length]);

  if (!tutorials.length) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
        <p className="text-sm text-slate-400">No tutorials yet</p>
        <Link href="/tutorials" className="mt-1 block text-xs font-semibold text-sky-600">
          Browse all →
        </Link>
      </div>
    );
  }

  const tut = tutorials[active];
  const fallbackImage = FALLBACK_IMAGES[active % FALLBACK_IMAGES.length];

  const difficultyStyle =
    tut.difficulty === "beginner"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : tut.difficulty === "intermediate"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <div className="mt-3 flex flex-col gap-3">
      {/* Main card */}
      <div
        className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900/60"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 320ms ease, transform 320ms ease",
        }}
      >
        {/* Cover image */}
        <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {/* Shimmer skeleton — visible until image loads */}
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-500 ${
              imgLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
          </div>

          <Image
            src={tut.cover_image || fallbackImage}
            alt={tut.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />

          {/* Difficulty badge — only show once image is loaded */}
          {imgLoaded && tut.difficulty && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${difficultyStyle}`}>
                {tut.difficulty}
              </span>
              {tut.estimated_minutes && (
                <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                  ~{tut.estimated_minutes} min
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-white">
            {tut.title}
          </p>
          {tut.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {tut.excerpt}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full w-[4%] rounded-full bg-sky-500" />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                1 of {tut.interactive_blocks?.length ?? "—"} steps completed
              </p>
              <Link
                href={`/tutorials/${tut.slug}`}
                className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
              >
                Continue →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {tutorials.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {tutorials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to tutorial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active
                  ? "w-5 bg-sky-500"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
