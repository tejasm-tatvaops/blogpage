"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";

export function TrendingWidget() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then((data: { posts?: BlogPost[] }) => setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
      <div className="flex items-center gap-2 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3.5">
        <span className="text-base leading-none" aria-hidden>🔥</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">Trending now</span>
      </div>

      {loading ? (
        <ul className="divide-y divide-slate-100">
          {[1, 2, 3].map((i) => (
            <li key={i} className="px-4 py-3.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-1.5 h-2 w-1/2 animate-pulse rounded bg-slate-100" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-slate-100">
          {posts.map((post, idx) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-orange-50/40"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-orange-100 text-[11px] font-bold text-orange-600">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-snug text-slate-800 transition group-hover:text-orange-700 line-clamp-2">
                    {post.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {post.view_count.toLocaleString()} views · {post.upvote_count} upvotes
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
