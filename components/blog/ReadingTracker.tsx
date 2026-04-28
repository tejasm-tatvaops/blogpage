"use client";

import { useEffect, useRef, useState } from "react";

type ReadingState = "unstarted" | "started" | "completed";

const STORAGE_PREFIX = "tatvaops_read_";

function reportDwellToBackend(slug: string, dwellMs: number, tags: string[], category: string) {
  void fetch("/api/feed/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "post_clicked",
      postSlug: slug,
      tags,
      category,
      dwellMs: Math.min(dwellMs, 1_800_000),
    }),
  }).catch(() => undefined);
}

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
  tags?: string[];
  category?: string;
};

export function ReadingTracker({ slug, tags = [], category = "" }: Omit<ReadingTrackerProps, "readingTimeMinutes"> & { readingTimeMinutes?: number }) {
  const [, setState] = useState<ReadingState>("unstarted");
  const [, setScrollPct] = useState(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
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
        reportDwellToBackend(slug, Date.now() - startTimeRef.current, tags, category);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, tags, category]);

  return null;
}
