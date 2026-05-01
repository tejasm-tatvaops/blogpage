// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES — all props, event handlers, and data preserved

import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";
import { getUserAvatar } from "@/lib/identityUI";
import { UserProfileQuickView } from "@/components/user/UserQuickView";

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

const reputationTone: Record<string, string> = {
  elite:       "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
  expert:      "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20",
  contributor: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20",
  member:      "bg-subtle text-muted",
};

export function ForumCard({ post }: ForumCardProps) {
  const identityKey = post.creator_fingerprint || `legacy:forum-post:${post.id}`;
  const avatar = getUserAvatar({ identity_key: identityKey, display_name: post.author_name });

  return (
    <article className="group">
      <div className="flex items-start gap-3">

        {/* Avatar */}
        <UserProfileQuickView
          identityKey={identityKey}
          displayName={post.author_name}
          trigger={
            <div className="relative mt-1 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-black/10 shadow-sm transition-transform duration-200 hover:scale-105 dark:ring-white/10">
              {avatar.type === "initials" ? (
                <div
                  className={`h-full w-full rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br ${avatar.gradient}`}
                >
                  {avatar.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <img
                  src={avatar.src}
                  alt="User avatar"
                  className={`h-full w-full object-cover ${avatar.type === "dicebear" ? "opacity-90" : ""}`}
                  loading="lazy"
                />
              )}
            </div>
          }
        />

        {/* Card bubble */}
        <Link
          href={`/forums/${post.slug}`}
          className="relative block min-w-0 flex-1 rounded-2xl forum-card-bg px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/30 hover:shadow-[0_4px_24px_rgba(234,88,12,0.10)]"
        >
          {/* Chat bubble tail */}
          <span className="absolute -left-2 top-4 h-3 w-3 rotate-45 border-b border-l forum-card-tail" />

          {/* Badges row */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {post.is_featured && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 ring-1 ring-amber-500/20">
                Featured
              </span>
            )}
            {post.best_comment_id && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/20">
                Best answer
              </span>
            )}
            {post.is_trending && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-400 ring-1 ring-orange-500/20">
                Trending
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${reputationTone[post.author_reputation_tier] ?? reputationTone.member}`}>
              {post.author_reputation_tier}
            </span>
            {(post.badges ?? []).slice(0, 2).map((badge) => (
              <span key={badge} className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 ring-1 ring-violet-500/20">
                {badge === "Top Thinker" ? "🧠 Top Thinker" : badge === "Hot Contributor" ? "🔥 Hot Contributor" : "💬 Discussion Starter"}
              </span>
            ))}
          </div>

          {/* Title */}
          <h2 className="line-clamp-2 text-base font-bold leading-snug text-heading transition-colors duration-200 group-hover:text-orange-500">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{post.excerpt}</p>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-faint">
            <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
              🧠 Quality {Math.round((post.quality_score ?? 0) * 100)}%
            </span>
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-400">
              🔥 Engagement {Math.round((post.engagement_score ?? 0) * 100)}%
            </span>
            <span className="font-medium text-muted">{post.author_name}</span>
            <time dateTime={post.created_at} className="text-faint">{formatDate(post.created_at)}</time>

            <div className="ml-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-orange-500">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                <span className="font-semibold text-app">{formatCount(post.upvote_count)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-faint">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{formatCount(post.comment_count)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-faint">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{formatCount(post.view_count)}</span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
