"use client";

import { useState } from "react";
import { mutate } from "swr";

type ForumVoteBarProps = {
  slug: string;
  initialUpvotes: number;
  initialDownvotes: number;
  commentCount: number;
};

const STORAGE_KEY_UP = (slug: string) => `forum_upvoted_${slug}`;
const STORAGE_KEY_DOWN = (slug: string) => `forum_downvoted_${slug}`;

export function ForumVoteBar({
  slug,
  initialUpvotes,
  initialDownvotes,
  commentCount,
}: ForumVoteBarProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [hasUpvoted, setHasUpvoted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_UP(slug)) === "1";
  });
  const [hasDownvoted, setHasDownvoted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_DOWN(slug)) === "1";
  });
  const [voting, setVoting] = useState(false);

  const vote = async (direction: "up" | "down") => {
    if (voting) return;
    const alreadyVoted = direction === "up" ? hasUpvoted : hasDownvoted;
    if (alreadyVoted) return;

    setVoting(true);
    try {
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) return;

      const json = (await res.json()) as {
        upvote_count?: number;
        downvote_count?: number;
      };

      if (direction === "up") {
        setUpvotes(json.upvote_count ?? upvotes + 1);
        setHasUpvoted(true);
        localStorage.setItem(STORAGE_KEY_UP(slug), "1");
      } else {
        setDownvotes(json.downvote_count ?? downvotes + 1);
        setHasDownvoted(true);
        localStorage.setItem(STORAGE_KEY_DOWN(slug), "1");
      }
      void mutate("/api/me/reputation");
    } finally {
      setVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Upvote */}
      <button
        type="button"
        onClick={() => vote("up")}
        disabled={voting || hasUpvoted}
        aria-label={`Upvote — ${upvotes}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          hasUpvoted
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-app bg-surface text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={hasUpvoted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        {upvotes}
      </button>

      {/* Downvote */}
      <button
        type="button"
        onClick={() => vote("down")}
        disabled={voting || hasDownvoted}
        aria-label={`Downvote — ${downvotes}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          hasDownvoted
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-app bg-surface text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={hasDownvoted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
        {downvotes}
      </button>

      {/* Score badge */}
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          score > 0
            ? "bg-indigo-50 text-indigo-700"
            : score < 0
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Comment count */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-app bg-surface px-3 py-1.5 text-sm text-slate-600">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {commentCount}
      </span>

    </div>
  );
}
