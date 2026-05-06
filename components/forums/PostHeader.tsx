import Link from "next/link";
import { ForumViewCount } from "@/components/forums/ForumViewCount";
import { LiveActivityPulse } from "@/components/shared/LiveActivityPulse";
import { ExpertiseBadge } from "@/components/shared/ExpertiseBadge";

type PostHeaderProps = {
  title: string;
  slug: string;
  tags: string[];
  linkedBlogSlug: string | null;
  authorName: string;
  authorTier: string;
  qualityScore: number | null;
  engagementScore: number | null;
  createdAt: string;
  viewCount: number;
  badges: string[];
  expertiseBadge?: string | null;
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function PostHeader({
  title,
  slug,
  tags,
  linkedBlogSlug,
  authorName,
  authorTier,
  qualityScore,
  engagementScore,
  createdAt,
  viewCount,
  badges,
  expertiseBadge,
}: PostHeaderProps) {
  const liveNowCount = Math.max(4, Math.round(viewCount / 35) + Math.round((engagementScore ?? 0) * 20));
  return (
    <div>
      <Link
        href="/forums"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-slate-500 transition-all duration-200 hover:text-orange-400"
      >
        <span aria-hidden>‹</span>
        Back to Forums
      </Link>

      <nav className="mb-4 mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500" aria-label="Breadcrumb">
        <Link href="/forums" className="transition duration-200 hover:text-orange-400">
          Forums
        </Link>
        {tags[0] && (
          <>
            <span aria-hidden>›</span>
            <Link href={`/forums?tag=${encodeURIComponent(tags[0])}`} className="transition duration-200 hover:text-orange-400">
              #{tags[0]}
            </Link>
          </>
        )}
        <span aria-hidden>›</span>
        <span className="line-clamp-1 text-slate-700">{title}</span>
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {linkedBlogSlug && (
            <Link
              href={`/blog/${linkedBlogSlug}`}
              className="inline-flex items-center gap-2 rounded-full border border-app bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition duration-200 hover:border-orange-400/60 hover:text-orange-600"
            >
              Read the original article
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(badges.length > 0 ? badges : ["Hot Contributor", "Discussion Starter"]).slice(0, 2).map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-app bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/forums?tag=${encodeURIComponent(tag)}`}
              className="rounded-full border border-app bg-surface px-2.5 py-1 text-[11px] font-medium text-slate-600 transition duration-200 hover:border-orange-400/60 hover:text-orange-600"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <h1 className="mb-3 font-serif text-[2rem] leading-tight tracking-tight text-app">{title}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-700">{authorName}</span>
        <ExpertiseBadge badge={expertiseBadge} />
        <span className="rounded-full border border-app bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{authorTier}</span>
        <span className="rounded-full border border-app bg-surface px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          {Math.round((qualityScore ?? 0) * 100)}%
        </span>
        <span className="rounded-full border border-app bg-surface px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          {Math.round((engagementScore ?? 0) * 100)}%
        </span>
        <span aria-hidden>·</span>
        <time dateTime={createdAt}>{formatDate(createdAt)}</time>
        <span aria-hidden>·</span>
        <ForumViewCount slug={slug} initialCount={viewCount} />
      </div>
      <LiveActivityPulse
        baseCount={liveNowCount}
        noun="builders discussing this now"
        className="mb-3 text-slate-500 dark:text-white/50"
      />
      <div className="mb-4 h-px bg-app" />
    </div>
  );
}
