"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";

type UpvoteButtonProps = {
  slug: string;
  initialCount: number;
};

export function UpvoteButton({ slug, initialCount }: UpvoteButtonProps) {
  const storageKey = `upvoted_${slug}`;
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUpvoted(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const handleUpvote = async () => {
    if (upvoted || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/upvote`, {
        method: "POST",
      });
      if (res.ok) {
        const json = (await res.json()) as { upvote_count: number };
        setCount(json.upvote_count);
        setUpvoted(true);
        localStorage.setItem(storageKey, "1");
        void mutate("/api/me/reputation");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleUpvote}
      disabled={upvoted || loading}
      aria-label={upvoted ? "Already upvoted" : "Upvote this article"}
      className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition
        ${upvoted
          ? "border-sky-200 bg-sky-50 text-sky-700 cursor-default"
          : "border-app bg-surface text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
        } disabled:opacity-70`}
    >
      {/* Thumbs-up icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={upvoted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition"
        aria-hidden
      >
        <path d="M7 10v12" />
        <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
      <span>{upvoted ? "Upvoted" : "Upvote"}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-xs ${upvoted ? "bg-sky-100" : "bg-slate-100 group-hover:bg-sky-100"}`}>
        {count}
      </span>
    </button>
  );
}
