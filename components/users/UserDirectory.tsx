"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isRealPhotoAvatar } from "@/lib/avatar";
import { getUserAvatar } from "@/lib/identityUI";
import { getLevelFromReputationScore, getLevelMeta } from "@/lib/level";
import type { UserProfile } from "@/lib/userProfileService";
import { deriveProfileContext, getBehaviorSegment, getRecentActions } from "@/lib/userProfileHelpers";

type BreakdownData = {
  total: number;
  breakdown: {
    views: number;
    comments: number;
    likes: number;
    shares: number;
    positive_feedback: number;
  };
};

type UserDirectoryProps = {
  users: UserProfile[];
  totals?: {
    blogViews: number;
    forumViews: number;
  };
  userTotals?: {
    blogViews: number;
    forumViews: number;
  };
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortIdentityId = (identityKey: string): string => identityKey.slice(-6).toUpperCase();
const formatRelative = (iso: string): string => {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const TIER_STYLES: Record<string, { label: string; className: string }> = {
  elite:       { label: "Elite",       className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  expert:      { label: "Expert",      className: "bg-purple-100 text-purple-700 border border-purple-300" },
  contributor: { label: "Contributor", className: "bg-sky-100 text-sky-700 border border-sky-300" },
  member:      { label: "Member",      className: "bg-slate-100 text-slate-600 border border-app" },
};

function UserTypeBadge({ userType }: { userType: UserProfile["user_type"] }) {
  if (userType === "REAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Real
      </span>
    );
  }
  if (userType === "ANONYMOUS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        Anonymous
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
      System
    </span>
  );
}

function ReputationBadge({ tier, score }: { tier: string; score: number }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.member!;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.className}`}>
      {style.label}
      {score > 0 && <span className="opacity-70">· {formatNumber(score)}</span>}
    </span>
  );
}

function InterestTags({ tags }: { tags: Record<string, number> }) {
  const top = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  if (top.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {top.map((tag) => (
        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          #{tag}
        </span>
      ))}
    </div>
  );
}

function ActivityBadges({ user }: { user: UserProfile }) {
  const badges: string[] = [];
  if (user.blog_views >= 120) badges.push("Reader");
  if (user.forum_posts + user.forum_comments >= 12) badges.push("Forum Active");
  if (user.blog_comments + user.forum_comments >= 10) badges.push("Contributor");
  if (user.blog_likes >= 15) badges.push("Engaged");
  if (badges.length === 0) badges.push("Member");
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.slice(0, 3).map((badge) => (
        <span key={badge} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
          {badge}
        </span>
      ))}
    </div>
  );
}

function ForumGamification({ user }: { user: UserProfile }) {
  const badges = (user.forum_badges ?? []).slice(0, 3);
  if (badges.length === 0 && (user.forum_posting_streak_days ?? 0) <= 0 && (user.forum_quality_streak_days ?? 0) <= 0) {
    return null;
  }

  const badgeLabel = (badge: string): string => {
    if (badge === "Top Thinker") return "🧠 Top Thinker";
    if (badge === "Hot Contributor") return "🔥 Hot Contributor";
    if (badge === "Discussion Starter") return "💬 Discussion Starter";
    return badge;
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Reputation highlights</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span key={badge} className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            {badgeLabel(badge)}
          </span>
        ))}
        {(user.forum_posting_streak_days ?? 0) > 0 ? (
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            📅 {user.forum_posting_streak_days}d posting streak
          </span>
        ) : null}
        {(user.forum_quality_streak_days ?? 0) > 0 ? (
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            ⭐ {user.forum_quality_streak_days}d quality streak
          </span>
        ) : null}
      </div>
    </div>
  );
}

function UserAvatarImage({
  user,
  sizeClass,
}: {
  user: UserProfile;
  sizeClass: string;
}) {
  const avatar = getUserAvatar(user);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = avatar.type !== "initials" && !imageFailed;

  if (!showImage) {
    const fallbackName = avatar.type === "initials" ? avatar.name : user.display_name || "User";
    const fallbackGradient =
      avatar.type === "initials" ? avatar.gradient : "from-slate-500 to-slate-700";
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${fallbackGradient} border border-white/10 shadow-sm ring-1 ring-white/5`}
      >
        {fallbackName.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={avatar.src}
      alt={`${user.display_name} avatar`}
      className={`${sizeClass} rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-white/5 ${
        avatar.type === "dicebear" ? "opacity-90" : ""
      }`}
      loading="lazy"
      onError={() => setImageFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}

export function UserDirectory({ users, totals, userTotals }: UserDirectoryProps) {
  const initialTotals = totals ?? { blogViews: 0, forumViews: 0 };
  const initialUserTotals = userTotals ?? { blogViews: 0, forumViews: 0 };
  const initialUsers = users ?? [];

  const [resolvedUsers, setResolvedUsers] = useState<UserProfile[]>(initialUsers);
  const [resolvedTotals, setResolvedTotals] = useState(initialTotals);
  const [resolvedUserTotals, setResolvedUserTotals] = useState(initialUserTotals);
  const [loading, setLoading] = useState((initialUsers?.length ?? 0) === 0);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "blog_views" | "forum_activity" | "reputation">("recent");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "real" | "anonymous" | "system">("all");

  // Breakdown panel: which card is open + locally cached results (no re-fetch)
  const [openBreakdownId, setOpenBreakdownId] = useState<string | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const breakdownCache = useRef<Map<string, BreakdownData>>(new Map());
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);

  const fetchBreakdown = async (user: UserProfile) => {
    if (openBreakdownId === user.id) {
      setOpenBreakdownId(null);
      return;
    }
    setOpenBreakdownId(user.id);
    const cached = breakdownCache.current.get(user.identity_key);
    if (cached) { setBreakdownData(cached); return; }
    setBreakdownLoading(true);
    setBreakdownData(null);
    try {
      const res = await fetch(`/api/reputation/${encodeURIComponent(user.identity_key)}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as BreakdownData;
        breakdownCache.current.set(user.identity_key, data);
        setBreakdownData(data);
      }
    } finally {
      setBreakdownLoading(false);
    }
  };
  const [activeOnly, setActiveOnly] = useState(false);
  const [gamifiedOnly, setGamifiedOnly] = useState(false);

  useEffect(() => {
    if ((users?.length ?? 0) > 0) {
      setResolvedUsers(users);
      setResolvedTotals(totals ?? { blogViews: 0, forumViews: 0 });
      setResolvedUserTotals(userTotals ?? { blogViews: 0, forumViews: 0 });
      setLoading(false);
    }
  }, [users, totals, userTotals]);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (userTypeFilter !== "all") params.set("type", userTypeFilter);
        const path = params.size > 0 ? `/api/users?${params.toString()}` : "/api/users";
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error(`/api/users returned ${res.status}`);
        const data = (await res.json()) as {
          users?: UserProfile[];
          totals?: { blogViews: number; forumViews: number };
          userTotals?: { blogViews: number; forumViews: number };
        };

        if (cancelled) return;
        setResolvedUsers(data.users || []);
        setResolvedTotals(data.totals || { blogViews: 0, forumViews: 0 });
        setResolvedUserTotals(data.userTotals || { blogViews: 0, forumViews: 0 });
      } catch (error) {
        if (!cancelled) console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userTypeFilter]);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = resolvedUsers.filter((user) => {
      const matchesSearch =
        (user.display_name ?? "").toLowerCase().includes(q) ||
        (user.about ?? "").toLowerCase().includes(q);

      // Search should behave like a directory lookup and bypass activity-style filters.
      if (q) return matchesSearch;

      if (photosOnly && !isRealPhotoAvatar(user.avatar_url)) return false;
      if (activeOnly && !user.is_active_now) return false;
      if (
        gamifiedOnly &&
        (user.forum_badges?.length ?? 0) === 0 &&
        (user.forum_quality_streak_days ?? 0) <= 0
      ) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === "blog_views") return b.blog_views - a.blog_views;
      if (sortBy === "forum_activity") {
        const aForum = a.forum_posts + a.forum_comments + a.forum_votes;
        const bForum = b.forum_posts + b.forum_comments + b.forum_votes;
        return bForum - aForum;
      }
      if (sortBy === "reputation") return b.reputation_score - a.reputation_score;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });
    return sorted;
  }, [resolvedUsers, query, sortBy, photosOnly, userTypeFilter, activeOnly, gamifiedOnly]);

  const safeTotals = resolvedTotals ?? { blogViews: 0, forumViews: 0 };
  const safeUserTotals = resolvedUserTotals ?? { blogViews: 0, forumViews: 0 };
  const blogViewsMatch = safeUserTotals.blogViews === safeTotals.blogViews;
  const forumViewsMatch = safeUserTotals.forumViews === safeTotals.forumViews;
  const helpfulUsers = useMemo(
    () =>
      [...resolvedUsers]
        .sort((a, b) => {
          const aScore = a.reputation_score + a.forum_comments * 3 + a.blog_comments * 2;
          const bScore = b.reputation_score + b.forum_comments * 3 + b.blog_comments * 2;
          return bScore - aScore;
        })
        .slice(0, 5),
    [resolvedUsers],
  );

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12">
      <header className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-app sm:text-5xl">Users</h1>
        <p className="mt-3 text-base leading-8 text-slate-600">
          A live directory of readers and contributors who have interacted with TatvaOps through blog
          reading, comments, forum discussions, and community activity.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-app bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Blog Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-app">{formatNumber(safeTotals.blogViews)}</p>
        </div>
        <div className="rounded-2xl border border-app bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Forum Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-app">{formatNumber(safeTotals.forumViews)}</p>
        </div>
        <div className="rounded-2xl border border-app bg-surface px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">User Blog Views</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${blogViewsMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {blogViewsMatch ? "Verified" : "Updating"}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-app">{formatNumber(safeUserTotals.blogViews)}</p>
        </div>
        <div className="rounded-2xl border border-app bg-surface px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">User Forum Views</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${forumViewsMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {forumViewsMatch ? "Verified" : "Updating"}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-app">{formatNumber(safeUserTotals.forumViews)}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-app bg-surface p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, bio, or interests"
          className="min-w-[220px] flex-1 rounded-lg border border-app px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "recent" | "blog_views" | "forum_activity" | "reputation")}
          className="rounded-lg border border-app bg-surface px-3 py-2 text-sm"
        >
          <option value="recent">Most recent</option>
          <option value="reputation">Highest reputation</option>
          <option value="blog_views">Most blog views</option>
          <option value="forum_activity">Most forum active</option>
        </select>
        {sortBy === "reputation" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Sorted by reputation
          </span>
        )}
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value as "all" | "real" | "anonymous" | "system")}
          className="rounded-lg border border-app bg-surface px-3 py-2 text-sm"
        >
          <option value="all">All Users</option>
          <option value="real">Real Users</option>
          <option value="anonymous">Anonymous Users</option>
          <option value="system">System Users</option>
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={photosOnly}
            onChange={(e) => setPhotosOnly(e.target.checked)}
          />
          Real photos only
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active now
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={gamifiedOnly}
            onChange={(e) => setGamifiedOnly(e.target.checked)}
          />
          Has reputation highlights
        </label>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Showing {formatNumber(visibleUsers.length)} users
        </span>
      </div>

      {helpfulUsers.length > 0 && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Recently Helpful</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {helpfulUsers.map((user) => (
              <span key={user.id} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm text-slate-700 shadow-sm">
                <div className="transition-transform duration-200 hover:scale-105">
                  <UserAvatarImage user={user} sizeClass="h-5 w-5 text-[9px]" />
                </div>
                {user.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-surface px-8 py-14 text-center text-slate-600">
          {resolvedUsers.length === 0
            ? "No user profiles yet. Once visitors start reading blogs or joining discussions, they will show up here."
            : "No users match your current filters. Try clearing filters or search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleUsers.map((user, idx) => {
            const isTop3 = sortBy === "reputation" && idx < 3;
            const context = deriveProfileContext(user);
            const segment = getBehaviorSegment(user);
            const actions = getRecentActions(user);
            const levelMeta = getLevelMeta(getLevelFromReputationScore(user.reputation_score));
            return (
              <article
                key={user.id}
                className={`rounded-3xl border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isTop3
                    ? "border-amber-300 ring-1 ring-amber-200 shadow-amber-100"
                    : "border-app"
                }`}
              >
              <div className="flex items-start gap-4">
                <div className="transition-transform duration-200 hover:scale-105">
                  <UserAvatarImage user={user} sizeClass="h-14 w-14 text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-app">
                      {user.display_name}
                      {user.user_type === "ANONYMOUS" && (
                        <span className="ml-2 text-xs font-medium text-gray-400">
                          · {shortIdentityId(user.identity_key)}
                        </span>
                      )}
                    </h2>
                    <ReputationBadge tier={user.reputation_tier} score={user.reputation_score} />
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${levelMeta.color}`}>
                      {levelMeta.icon} {levelMeta.label}
                    </span>
                    <UserTypeBadge userType={user.user_type} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${segment.className}`}>
                      {segment.label}
                    </span>
                    {user.is_active_now ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Active now
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500 line-clamp-2">{user.about}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {context.role} • {context.city} • {context.years} yrs exp
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                      <span>Reputation</span>
                      <span className="rounded-full bg-surface/20 px-2 py-0.5">{formatNumber(user.reputation_score)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchBreakdown(user)}
                      className="text-[11px] text-slate-400 underline-offset-2 hover:text-sky-600 hover:underline"
                    >
                      {openBreakdownId === user.id ? "Hide" : "Breakdown"}
                    </button>
                  </div>
                </div>
              </div>

              {openBreakdownId === user.id && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/60">
                  {breakdownLoading && !breakdownCache.current.has(user.identity_key) ? (
                    <p className="text-slate-400">Loading…</p>
                  ) : (() => {
                    const d = breakdownCache.current.get(user.identity_key) ?? breakdownData;
                    if (!d) return <p className="text-slate-400">No data yet.</p>;
                    return (
                      <>
                        <p className="mb-2 font-semibold text-slate-600 dark:text-slate-300">How it&apos;s calculated</p>
                        <ul className="space-y-1 text-slate-500 dark:text-slate-400">
                          <li>👁 Views: {formatNumber(d.breakdown.views)} × 1</li>
                          <li>💬 Comments: {formatNumber(d.breakdown.comments)} × 2</li>
                          <li>❤️ Likes: {formatNumber(d.breakdown.likes)} × 1</li>
                          <li>🔁 Shares: {formatNumber(d.breakdown.shares)} × 2</li>
                          <li>⭐ Feedback: {formatNumber(d.breakdown.positive_feedback)} × 10</li>
                        </ul>
                        <p className="mt-2 border-t border-slate-200 pt-2 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          Total = {formatNumber(d.total)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">Earn points by engaging — read, comment, share, or mention TatvaOps.</p>
                      </>
                    );
                  })()}
                </div>
              )}

              <InterestTags tags={user.interest_tags} />
              <ForumGamification user={user} />
              <ActivityBadges user={user} />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-subtle px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Blog views</p>
                  <p className="mt-0.5 text-base font-semibold text-app">{formatNumber(user.blog_views)}</p>
                </div>
                <div className="rounded-xl bg-subtle px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Forum posts</p>
                  <p className="mt-0.5 text-base font-semibold text-app">{formatNumber(user.forum_posts)}</p>
                </div>
                <div className="rounded-xl bg-subtle px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Likes cast</p>
                  <p className="mt-0.5 text-base font-semibold text-app">{formatNumber(user.blog_likes)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                <p className="text-xs text-slate-400">Seen {formatRelative(user.last_seen_at)}</p>
                <p className="text-xs text-slate-400">Joined {formatDate(user.created_at)}</p>
                {user.last_blog_slug ? (
                  <p>
                    Last blog:{" "}
                    <Link href={`/blog/${user.last_blog_slug}`} className="font-medium text-sky-700 hover:underline">
                      {user.last_blog_slug}
                    </Link>
                  </p>
                ) : null}
                {user.last_forum_slug ? (
                  <p>
                    Last forum:{" "}
                    <Link href={`/forums/${user.last_forum_slug}`} className="font-medium text-sky-700 hover:underline">
                      {user.last_forum_slug}
                    </Link>
                  </p>
                ) : null}
                <div className="pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Recent activity</p>
                  <div className="mt-1 space-y-1">
                    {actions.map((action) => (
                      <Link key={`${user.id}-${action.text}`} href={action.href} className="block text-xs text-slate-500 hover:text-sky-700">
                        • {action.text}
                      </Link>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Profile derived from activity signals and updated automatically.
                </p>
              </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
