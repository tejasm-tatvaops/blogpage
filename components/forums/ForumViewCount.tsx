"use client";

import { useEffect, useState } from "react";

type ForumViewCountProps = {
  slug: string;
  initialCount: number;
};

export function ForumViewCount({ slug, initialCount }: ForumViewCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const storageKey = `tatvaops:forum-viewed:${slug}`;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(storageKey)) return;

    let cancelled = false;
    const track = async () => {
      try {
        const response = await fetch(`/api/forums/${encodeURIComponent(slug)}`, {
          method: "POST",
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as { view_count?: number };
        if (!cancelled && typeof json.view_count === "number") {
          setCount(json.view_count);
          window.sessionStorage.setItem(storageKey, "1");
        }
      } catch {
        // Silent fail: view tracking should never block page rendering.
      }
    };

    void track();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return <span>{count.toLocaleString()} views</span>;
}
