// Styling + optional feed context (active thread, reveal). Data / links preserved.

import Link from "next/link";
import { forwardRef } from "react";
import type { ForumPost } from "@/lib/forumService";
import { getUserAvatar } from "@/lib/identityUI";
import { UserProfileQuickView } from "@/components/user/UserQuickView";
import { cn } from "@/lib/cn";
import { ContextChip } from "@/components/shared/ContextChip";
import { LiveActivityPulse } from "@/components/shared/LiveActivityPulse";
import { ExpertiseBadge } from "@/components/shared/ExpertiseBadge";
import { resolveContextualIdentity } from "@/lib/expertiseContext";

export type ForumCardFeedUi = {
  isActive: boolean;
  revealed: boolean;
  index: number;
  /** Entrance stagger; parent caps total (e.g. max 80ms). */
  staggerDelayMs?: number;
};

export type ForumCardProps = {
  post: ForumPost;
  /** When set (forum thread feed), enables scroll-linked active + entrance motion. */
  feedUi?: ForumCardFeedUi;
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

const FEED_ARTICLE_MOTION =
  "transition-[opacity,transform] duration-[280ms] ease-out will-change-[transform,opacity]";
const FEED_LINK_SURFACE = "transition-[box-shadow,border-color] duration-[280ms] ease-out";

export const ForumCard = forwardRef<HTMLElement, ForumCardProps>(function ForumCard(
  { post, feedUi },
  ref,
) {
  const identityKey = post.creator_fingerprint || `legacy:forum-post:${post.id}`;
  const avatar = getUserAvatar({ identity_key: identityKey, display_name: post.author_name });

  const isFeed = Boolean(feedUi);
  const isActive = feedUi?.isActive ?? true;
  const revealed = feedUi?.revealed ?? true;
  const staggerDelayMs = isFeed ? (feedUi?.staggerDelayMs ?? Math.min(feedUi?.index ?? 0, 10) * 8) : 0;
  const forumContextText = post.is_trending
    ? `Trending among ${post.tags[0] ?? "construction"} builders`
    : post.tags[0]
    ? `Based on interest in #${post.tags[0]}`
    : null;
  const liveNowCount = Math.max(3, Math.round(post.comment_count / 2) + Math.round(post.view_count / 45));
  const contextualIdentity = resolveContextualIdentity({
    baseBadge: post.author_expertise_badge,
    profession: post.author_profession,
    expertise: post.author_expertise,
    contextTags: post.tags,
  });

  const articleMotion = isFeed
    ? cn(
        FEED_ARTICLE_MOTION,
        !revealed && "-translate-x-6 scale-[0.97] opacity-0",
        revealed && "translate-x-0",
        revealed && isActive && "z-[1] scale-[1.02] opacity-100",
        revealed && !isActive && "scale-100 opacity-60",
      )
    : "";

  const linkSurface = cn(
    "relative block min-w-0 flex-1 rounded-2xl p-5",
    "bg-white/70 dark:bg-[rgba(20,25,45,0.7)]",
    "backdrop-blur-xl",
    "border border-black/5 dark:border-white/10",
    "shadow-md",
    isFeed ? FEED_LINK_SURFACE : "transition-all duration-300",
    !isFeed && "hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]",
    isFeed &&
      revealed &&
      isActive &&
      "border-orange-500/40 shadow-[0_16px_48px_rgba(249,115,22,0.22),0_0_0_1px_rgba(249,115,22,0.35),0_0_40px_rgba(249,115,22,0.12)] dark:border-orange-400/40 dark:shadow-[0_14px_44px_rgba(0,0,0,0.5),0_0_36px_rgba(249,115,22,0.18)]",
    isFeed && revealed && !isActive && "border-black/5 dark:border-white/10 shadow-sm",
  );

  return (
    <article
      ref={ref}
      data-thread-id={post.id}
      className={cn("group transform-gpu", articleMotion)}
      style={isFeed ? { transitionDelay: `${staggerDelayMs}ms` } : undefined}
    >
      <div className={cn("flex items-start", isFeed ? "gap-2" : "gap-3")}>
        {isFeed ? (
          <div
            className="flex w-[3px] shrink-0 justify-center pt-5"
            aria-hidden
          >
            <span
              className={cn(
                "h-6 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-amber-200 via-orange-500 to-orange-700 shadow-[0_0_14px_rgba(249,115,22,0.55)] transition-opacity duration-300 ease-out",
                revealed && isActive ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        ) : null}

        {/* Avatar */}
        <UserProfileQuickView
          identityKey={identityKey}
          displayName={post.author_name}
          trigger={
            <div className="relative mt-1 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-black/10 shadow-sm transition-transform duration-200 hover:scale-105 dark:ring-white/10">
              {avatar.type === "initials" ? (
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full text-[0.62rem] font-semibold leading-none text-white bg-gradient-to-br ${avatar.gradient}`}
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
        <Link href={`/forums/${post.slug}`} className={linkSurface}>
          {/* Badges row */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {post.is_featured && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase leading-none tracking-wide text-amber-400 ring-1 ring-amber-500/20">
                Featured
              </span>
            )}
            {post.best_comment_id && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase leading-none tracking-wide text-emerald-400 ring-1 ring-emerald-500/20">
                Best answer
              </span>
            )}
            {post.is_trending && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase leading-none tracking-wide text-orange-400 ring-1 ring-orange-500/20">
                Trending
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase leading-none tracking-wide ${reputationTone[post.author_reputation_tier] ?? reputationTone.member}`}
            >
              {post.author_reputation_tier}
            </span>
            <ExpertiseBadge badge={contextualIdentity.label} className={contextualIdentity.contextual ? "text-[10px]" : "text-[10px] opacity-80"} />
            {(post.badges ?? []).slice(0, 2).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[0.58rem] font-bold leading-none text-violet-400 ring-1 ring-violet-500/20"
              >
                {badge === "Top Thinker" ? "🧠 Top Thinker" : badge === "Hot Contributor" ? "🔥 Hot Contributor" : "💬 Discussion Starter"}
              </span>
            ))}
          </div>

          {/* Title */}
          <h2 className="line-clamp-2 text-[0.88rem] font-semibold leading-tight text-black dark:text-white">
            {post.title}
          </h2>

          {forumContextText ? (
            <div className="mt-2">
              <ContextChip
                text={forumContextText}
                keyword={post.tags[0] ?? "construction"}
              />
            </div>
          ) : null}

          {/* Excerpt */}
          <p className="mt-1 line-clamp-2 font-sans text-[0.75rem] font-normal leading-[1.5] text-gray-500 dark:text-white/60">
            {post.excerpt}
          </p>

          <div className="mt-2 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[0.54rem] font-medium uppercase leading-none tracking-wide text-gray-400">
                QUALITY {Math.round((post.quality_score ?? 0) * 100)}%
              </span>
              <span className="h-[3px] w-[60px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <span className="block h-full bg-orange-500" style={{ width: `${Math.round((post.quality_score ?? 0) * 100)}%` }} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.54rem] font-medium uppercase leading-none tracking-wide text-gray-400">
                ENGAGEMENT {Math.round((post.engagement_score ?? 0) * 100)}%
              </span>
              <span className="h-[3px] w-[60px] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <span className="block h-full bg-orange-500" style={{ width: `${Math.round((post.engagement_score ?? 0) * 100)}%` }} />
              </span>
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-4 flex items-center justify-between">
            <div className="font-sans text-[0.62rem] font-normal leading-none text-gray-400">
              {post.author_name} · <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            </div>

            <div className="flex gap-3 font-sans text-[0.56rem] font-normal leading-none text-gray-400">
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                {formatCount(post.upvote_count)}
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {formatCount(post.comment_count)}
              </span>
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {formatCount(post.view_count)}
              </span>
            </div>
          </div>
          <div className="mt-2">
            <LiveActivityPulse
              baseCount={liveNowCount}
              noun="builders discussing now"
              className="text-gray-500 dark:text-white/50"
            />
          </div>
        </Link>
      </div>
    </article>
  );
});

ForumCard.displayName = "ForumCard";
