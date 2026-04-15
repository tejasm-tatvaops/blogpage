"use client";

import { useEffect, useRef, useState } from "react";

type ReadingState = "unstarted" | "started" | "completed";

const STORAGE_PREFIX = "tatvaops_read_";

function getReadingState(slug: string): ReadingState {
  if (typeof window === "undefined") return "unstarted";
  return (localStorage.getItem(STORAGE_PREFIX + slug) as ReadingState) ?? "unstarted";
}

function setReadingState(slug: string, state: ReadingState) {
  localStorage.setItem(STORAGE_PREFIX + slug, state);
  window.dispatchEvent(new CustomEvent("reading-state-changed", { detail: { slug, state } }));
}

export function useReadingState(slug: string) {
  const [state, setState] = useState<ReadingState>("unstarted");
  useEffect(() => {
    setState(getReadingState(slug));
  }, [slug]);
  return state;
}

type ReadingTrackerProps = {
  slug: string;
  readingTimeMinutes: number;
};

export function ReadingTracker({ slug, readingTimeMinutes }: ReadingTrackerProps) {
  const [state, setState] = useState<ReadingState>("unstarted");
  const [scrollPct, setScrollPct] = useState(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const saved = getReadingState(slug);
    setState(saved);
    if (saved === "completed") completedRef.current = true;
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;

      const pct = Math.round((window.scrollY / total) * 100);
      setScrollPct(Math.min(100, pct));

      if (!startedRef.current && pct > 5) {
        startedRef.current = true;
        if (getReadingState(slug) === "unstarted") {
          setReadingState(slug, "started");
          setState("started");
        }
      }

      if (!completedRef.current && pct >= 80) {
        completedRef.current = true;
        setReadingState(slug, "completed");
        setState("completed");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  // Don't render anything until client-mounted
  if (state === "unstarted" && scrollPct === 0) return null;

  if (state === "completed") {
    return (
      <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        You finished this article! ({readingTimeMinutes} min read)
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-sky-700">
        <span>Reading progress</span>
        <span>{scrollPct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-200">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-300"
          style={{ width: `${scrollPct}%` }}
        />
      </div>
    </div>
  );
}
