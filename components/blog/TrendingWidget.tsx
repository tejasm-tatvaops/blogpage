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
    <div className="overflow-hidden rounded-2xl border border-app bg-surface">
      <div className="flex items-center gap-2 border-b border-app bg-subtle px-4 py-3.5">
        <span className="text-sm leading-none" aria-hidden>🔥</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-app">Trending now</span>
      </div>

      {loading ? (
        <ul className="divide-y divide-app">
          {[1, 2, 3].map((i) => (
            <li key={i} className="px-4 py-3.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-subtle" />
              <div className="mt-1.5 h-2 w-1/2 animate-pulse rounded bg-subtle" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-app">
          {posts.map((post, idx) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-subtle"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-warning-soft text-[11px] font-bold text-warning-soft">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-snug text-app transition group-hover:text-primary line-clamp-2">
                    {post.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
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
