"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DiscussButtonProps = {
  blogSlug: string;
  blogTitle: string;
  /** Pre-resolved forum slug if the thread already exists. */
  initialForumSlug?: string | null;
};

export function DiscussButton({ blogSlug, blogTitle, initialForumSlug }: DiscussButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (initialForumSlug) {
      router.push(`/forums/${initialForumSlug}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/forums/blog-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blog_slug: blogSlug, blog_title: blogTitle }),
      });
      const json = (await res.json()) as { forum_slug?: string; error?: string };
      if (res.ok && json.forum_slug) {
        router.push(`/forums/${json.forum_slug}`);
      }
    } catch {
      /* silently fail — user still sees the button */
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Opening discussion…
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Discuss this article
        </>
      )}
    </button>
  );
}
