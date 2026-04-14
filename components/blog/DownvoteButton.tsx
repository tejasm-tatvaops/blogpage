"use client";

import { useState } from "react";

type DownvoteButtonProps = {
  slug: string;
  initialCount: number;
};

export function DownvoteButton({ slug, initialCount }: DownvoteButtonProps) {
  const storageKey = `downvoted_${slug}`;
  const [count, setCount] = useState(initialCount);
  const [downvoted, setDownvoted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });
  const [loading, setLoading] = useState(false);

  const handleDownvote = async () => {
    if (downvoted || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/downvote`, {
        method: "POST",
      });
      if (res.ok) {
        const json = (await res.json()) as { downvote_count: number };
        setCount(json.downvote_count);
        setDownvoted(true);
        localStorage.setItem(storageKey, "1");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownvote}
      disabled={downvoted || loading}
      aria-label={downvoted ? "Already downvoted" : "Downvote this article"}
      className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition
        ${downvoted
          ? "border-rose-200 bg-rose-50 text-rose-700 cursor-default"
          : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
        } disabled:opacity-70`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={downvoted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition"
        aria-hidden
      >
        <path d="M17 14V2" />
        <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
      </svg>
      <span>{downvoted ? "Downvoted" : "Downvote"}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          downvoted ? "bg-rose-100" : "bg-slate-100 group-hover:bg-rose-100"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
