"use client";

import { useEffect, useState } from "react";

type ViewCountProps = {
  slug: string;
  initialCount: number;
};

export function ViewCount({ slug, initialCount }: ViewCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const storageKey = `tatvaops:viewed:${slug}`;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(storageKey)) return;

    let cancelled = false;
    const track = async () => {
      try {
        const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/view`, {
          method: "POST",
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as { views?: number };
        if (!cancelled && typeof json.views === "number") {
          setCount(json.views);
          window.sessionStorage.setItem(storageKey, "1");
        }
      } catch {
        // Silent fail: view tracking must never block page rendering.
      }
    };

    track();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>{count.toLocaleString()} views</span>
    </span>
  );
}
