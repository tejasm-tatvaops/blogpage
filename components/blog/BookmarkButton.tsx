"use client";

import { useEffect, useState } from "react";

type BookmarkEntry = { slug: string; title: string; excerpt: string; savedAt: number };

const STORAGE_KEY = "tatvaops_bookmarks";

export function getBookmarks(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as BookmarkEntry[];
  } catch {
    return [];
  }
}

function saveBookmarks(entries: BookmarkEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

type Props = { slug: string; title: string; excerpt: string };

export function BookmarkButton({ slug, title, excerpt }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getBookmarks().some((b) => b.slug === slug));
  }, [slug]);

  const toggle = () => {
    const current = getBookmarks();
    if (saved) {
      saveBookmarks(current.filter((b) => b.slug !== slug));
      setSaved(false);
    } else {
      saveBookmarks([...current, { slug, title, excerpt, savedAt: Date.now() }]);
      setSaved(true);
    }
    // Dispatch custom event so other tabs/components can sync
    window.dispatchEvent(new CustomEvent("bookmarks-changed"));
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove bookmark" : "Bookmark this article"}
      title={saved ? "Remove bookmark" : "Save for later"}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
        saved
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
