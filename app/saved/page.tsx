"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBookmarks } from "@/components/blog/BookmarkButton";

type BookmarkEntry = { slug: string; title: string; excerpt: string; savedAt: number };

export default function SavedPostsPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = () => setBookmarks(getBookmarks().sort((a, b) => b.savedAt - a.savedAt));
    load();
    window.addEventListener("bookmarks-changed", load);
    return () => window.removeEventListener("bookmarks-changed", load);
  }, []);

  const remove = (slug: string) => {
    const updated = bookmarks.filter((b) => b.slug !== slug);
    localStorage.setItem("tatvaops_bookmarks", JSON.stringify(updated));
    setBookmarks(updated);
    window.dispatchEvent(new CustomEvent("bookmarks-changed"));
  };

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-app">Saved articles</h1>
        <p className="mt-1 text-sm text-slate-500">
          {bookmarks.length === 0 ? "Nothing saved yet." : `${bookmarks.length} article${bookmarks.length === 1 ? "" : "s"} saved`}
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app bg-subtle px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            Tap the <strong>Save</strong> button on any article to bookmark it here.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            Browse articles
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {bookmarks.map((b) => (
            <li key={b.slug} className="group rounded-2xl border border-slate-100 bg-surface p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/blog/${b.slug}`}
                    className="text-base font-bold leading-snug text-app transition group-hover:text-sky-700 line-clamp-2"
                  >
                    {b.title}
                  </Link>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{b.excerpt}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Saved {new Date(b.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => remove(b.slug)}
                  aria-label="Remove bookmark"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
