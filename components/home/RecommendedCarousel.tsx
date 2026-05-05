"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const FALLBACK_IMAGES = [
  "/images/construction/house-2.jpg",
  "/images/construction/site-4.jpg",
  "/images/construction/bangalore-1.jpg",
  "/images/construction/house-3.jpg",
  "/images/construction/concrete-mix-1.png",
  "/images/construction/modern-house-1.png",
];

type Blog = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  author: string;
  created_at: string;
  tags: string[];
  view_count: number;
  upvote_count: number;
};

export default function RecommendedCarousel({ blogs }: { blogs: Blog[] }) {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

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
    if (blogs.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % blogs.length);
        setVisible(true);
      }, 320);
    }, 5000);
    return () => clearInterval(id);
  }, [blogs.length]);

  if (!blogs.length) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
        <p className="text-sm text-slate-400">No posts yet</p>
        <Link href="/blog" className="mt-1 block text-xs font-semibold text-sky-600">
          Browse all →
        </Link>
      </div>
    );
  }

  const blog = blogs[active];
  const fallbackImage = FALLBACK_IMAGES[active % FALLBACK_IMAGES.length];

  return (
    <div className="mt-3 flex flex-col gap-3">
      <Link
        href={`/blog/${blog.slug}`}
        className="group block rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-sky-700/40"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 320ms ease, transform 320ms ease",
        }}
      >
        <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {/* Shimmer */}
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-500 ${
              imgLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
          </div>

          <Image
            src={blog.cover_image || fallbackImage}
            alt={blog.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />

          {imgLoaded && blog.tags.length > 0 && (
            <div className="absolute bottom-2 left-2 z-20 flex flex-wrap gap-1">
              {blog.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
            {blog.title}
          </p>
          {blog.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {blog.excerpt}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2 dark:border-slate-700">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {blog.view_count}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              {blog.upvote_count}
            </span>
            <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {blog.author}
            </span>
          </div>
        </div>
      </Link>

      {blogs.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {blogs.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to blog ${i + 1}`}
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
