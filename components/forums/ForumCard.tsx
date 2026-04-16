import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";

type ForumCardProps = {
  post: ForumPost;
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

export function ForumCard({ post }: ForumCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md">
      <Link href={`/forums/${post.slug}`} className="block">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition group-hover:text-indigo-700">
          {post.title}
        </h2>
        {post.is_trending && (
          <span className="mt-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
            🔥 Trending
          </span>
        )}

        {/* Excerpt */}
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{post.excerpt}</p>
      </Link>

      {/* Meta bar */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{post.author_name}</span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>

        <div className="ml-auto flex items-center gap-3">
          {/* Upvotes */}
          <span className="inline-flex items-center gap-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-indigo-500"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span className="font-semibold text-slate-700">{formatCount(post.upvote_count)}</span>
          </span>

          {/* Comments */}
          <span className="inline-flex items-center gap-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-slate-400"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{formatCount(post.comment_count)}</span>
          </span>

          {/* Views */}
          <span className="inline-flex items-center gap-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-slate-400"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{formatCount(post.view_count)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
