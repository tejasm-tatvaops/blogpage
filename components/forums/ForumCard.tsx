import Link from "next/link";
import type { ForumPost } from "@/lib/forumService";
import { getAvatarForIdentity } from "@/lib/avatar";
import { UserProfileQuickView } from "@/components/users/UserProfileQuickView";

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
  const avatarSrc = getAvatarForIdentity(`${post.author_name}|${post.id}`);

  return (
    <article className="group">
      <div className="flex items-start gap-3">
        <UserProfileQuickView
          displayName={post.author_name}
          trigger={
            <div className="relative mt-1 h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
              <img
                src={avatarSrc}
                alt={`${post.author_name} avatar`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          }
        />

        <Link
          href={`/forums/${post.slug}`}
          className="relative block min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
        >
          <span className="absolute -left-2 top-4 h-3 w-3 rotate-45 border-b border-l border-slate-200 bg-white" />

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

          <h2 className="line-clamp-2 text-[1.72rem] font-bold leading-snug text-slate-900 transition group-hover:text-indigo-700">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              🧠 Quality {Math.round((post.quality_score ?? 0) * 100)}%
            </span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              🔥 Engagement {Math.round((post.engagement_score ?? 0) * 100)}%
            </span>
            <span className="font-medium text-slate-700">{post.author_name}</span>
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>

            <div className="ml-auto flex items-center gap-3">
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
