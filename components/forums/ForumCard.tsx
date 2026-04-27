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
  elite: "bg-amber-100 text-amber-700",
  expert: "bg-violet-100 text-violet-700",
  contributor: "bg-sky-100 text-sky-700",
  member: "bg-slate-100 text-slate-600",
};

export function ForumCard({ post }: ForumCardProps) {
  const identityKey = post.creator_fingerprint || `legacy:forum-post:${post.id}`;
  const avatar = getUserAvatar({ identity_key: identityKey, display_name: post.author_name });

  return (
    <article className="group">
      <div className="flex items-start gap-3">
        <UserProfileQuickView
          identityKey={identityKey}
          displayName={post.author_name}
          trigger={
            <div className="relative mt-1 h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm transition-transform duration-200 hover:scale-105">
              {avatar.type === "initials" ? (
                <div
                  className={`h-full w-full rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br ${avatar.gradient} border border-white/10 shadow-sm ring-1 ring-white/5`}
                >
                  {avatar.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <img
                  src={avatar.src}
                  alt="User avatar"
                  className={`h-full w-full object-cover border border-white/10 shadow-sm ring-1 ring-white/5 ${
                    avatar.type === "dicebear" ? "opacity-90" : ""
                  }`}
                  loading="lazy"
                />
              )}
            </div>
          }
        />

        <Link
          href={`/forums/${post.slug}`}
          className="relative block min-w-0 flex-1 rounded-2xl border border-app bg-surface px-3 py-3 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md sm:px-4 sm:py-4"
        >
          <span className="absolute -left-2 top-4 h-3 w-3 rotate-45 border-b border-l border-app bg-surface" />

          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {post.is_featured && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Featured
              </span>
            )}
            {post.best_comment_id && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Best answer
              </span>
            )}
            {post.is_trending && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                Trending
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${reputationTone[post.author_reputation_tier] ?? reputationTone.member}`}>
              {post.author_reputation_tier}
            </span>
            {(post.badges ?? []).slice(0, 2).map((badge) => (
              <span key={badge} className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {badge === "Top Thinker" ? "🧠 Top Thinker" : badge === "Hot Contributor" ? "🔥 Hot Contributor" : "💬 Discussion Starter"}
              </span>
            ))}
          </div>

          <h2 className="line-clamp-2 break-words text-xl font-bold leading-snug text-app transition group-hover:text-indigo-700 sm:text-2xl lg:text-[1.72rem]">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600 sm:text-sm">{post.excerpt}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              🧠 Quality {Math.round((post.quality_score ?? 0) * 100)}%
            </span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              🔥 Engagement {Math.round((post.engagement_score ?? 0) * 100)}%
            </span>
            <span className="font-medium text-slate-700">{post.author_name}</span>
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>

            <div className="w-full sm:ml-auto sm:w-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-indigo-500">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                <span className="font-semibold text-slate-700">{formatCount(post.upvote_count)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{formatCount(post.comment_count)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400">
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
