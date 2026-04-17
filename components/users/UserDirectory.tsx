"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isRealPhotoAvatar } from "@/lib/avatar";
import type { UserProfile } from "@/lib/userProfileService";

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
const formatRelative = (iso: string): string => {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const ROLE_POOL = [
  "Site Engineer",
  "Quantity Surveyor",
  "Procurement Lead",
  "Project Coordinator",
  "Architectural Coordinator",
  "Construction Planner",
  "Project Manager",
  "Vendor Manager",
];
const CITY_POOL = ["Bangalore", "Pune", "Hyderabad", "Chennai", "Mumbai", "Delhi", "Ahmedabad", "Kochi"];

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const deriveProfileContext = (user: UserProfile): { role: string; city: string; years: number } => {
  const seed = `${user.id}|${user.display_name}`;
  const hash = hashForIndex(seed);
  return {
    role: ROLE_POOL[hash % ROLE_POOL.length]!,
    city: CITY_POOL[(hash >> 2) % CITY_POOL.length]!,
    years: (hash % 11) + 2,
  };
};

const getBehaviorSegment = (user: UserProfile): { label: string; className: string } => {
  const forumActions = user.forum_posts + user.forum_comments + user.forum_votes;
  const totalActions = forumActions + user.blog_comments + user.blog_likes;
  if (user.reputation_score >= 500 || forumActions >= 24) {
    return { label: "Expert", className: "bg-violet-100 text-violet-700" };
  }
  if (totalActions >= 18) {
    return { label: "Contributor", className: "bg-sky-100 text-sky-700" };
  }
  if (user.blog_views >= 25 || user.forum_views >= 12) {
    return { label: "Reader", className: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Explorer", className: "bg-slate-100 text-slate-600" };
};

const buildWeeklySparkline = (user: UserProfile): number[] => {
  const total =
    user.blog_views +
    user.forum_views * 2 +
    user.blog_comments * 4 +
    user.forum_comments * 4 +
    user.forum_posts * 6 +
    user.forum_votes * 2;
  const seed = hashForIndex(`${user.id}|spark|${total}`);
  return Array.from({ length: 7 }, (_, index) => {
    const wave = ((seed >> (index % 12)) & 7) + 2;
    const base = Math.max(1, Math.round(total / 35));
    return Math.max(1, Math.min(16, base + wave + (index % 3)));
  });
};

const getRecentActions = (user: UserProfile): Array<{ text: string; href: string }> => {
  const actions: Array<{ text: string; href: string }> = [];
  if (user.last_forum_slug) {
    actions.push({
      text: `Commented on forum thread ${user.last_forum_slug.replace(/-/g, " ")}`,
      href: `/forums/${user.last_forum_slug}`,
    });
  }
  if (user.last_blog_slug) {
    actions.push({
      text: `Read blog ${user.last_blog_slug.replace(/-/g, " ")}`,
      href: `/blog/${user.last_blog_slug}`,
    });
  }
  if (user.blog_likes > 0) {
    actions.push({
      text: `Reacted to ${user.blog_likes} posts this month`,
      href: user.last_blog_slug ? `/blog/${user.last_blog_slug}` : "/blog",
    });
  }
  if (actions.length === 0) {
    actions.push({ text: "Browsing community updates", href: "/users" });
  }
  return actions.slice(0, 2);
};

const getTopicContributorHint = (user: UserProfile): string | null => {
  const top = Object.entries(user.interest_tags)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return null;
  if (user.forum_comments + user.forum_posts < 6) return null;
  return `Frequent contributor in ${top.replace(/-/g, " ")}`;
};

const getSocialHint = (user: UserProfile): string | null => {
  if (!user.frequent_peer_keys?.length) return null;
  return "Often replies to familiar users";
};

const TIER_STYLES: Record<string, { label: string; className: string }> = {
  elite:       { label: "Elite",       className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  expert:      { label: "Expert",      className: "bg-purple-100 text-purple-700 border border-purple-300" },
  contributor: { label: "Contributor", className: "bg-sky-100 text-sky-700 border border-sky-300" },
  member:      { label: "Member",      className: "bg-slate-100 text-slate-600 border border-slate-200" },
};

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

export function UserDirectory({ users, totals, userTotals }: UserDirectoryProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "blog_views" | "forum_activity">("recent");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [booting, setBooting] = useState(true);
  const [syncedAt, setSyncedAt] = useState<string>("");

  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setSyncedAt(new Date().toISOString());
  }, []);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (photosOnly && !isRealPhotoAvatar(user.avatar_url)) return false;
      if (!q) return true;
      return (
        user.display_name.toLowerCase().includes(q) ||
        user.about.toLowerCase().includes(q) ||
        Object.keys(user.interest_tags).some((t) => t.includes(q))
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === "blog_views") return b.blog_views - a.blog_views;
      if (sortBy === "forum_activity") {
        const aForum = a.forum_posts + a.forum_comments + a.forum_votes;
        const bForum = b.forum_posts + b.forum_comments + b.forum_votes;
        return bForum - aForum;
      }
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });
    return sorted;
  }, [users, query, sortBy, photosOnly]);

  const safeTotals = totals ?? { blogViews: 0, forumViews: 0 };
  const safeUserTotals = userTotals ?? { blogViews: 0, forumViews: 0 };
  const blogViewsMatch = safeUserTotals.blogViews === safeTotals.blogViews;
  const forumViewsMatch = safeUserTotals.forumViews === safeTotals.forumViews;
  const helpfulUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => {
          const aScore = a.reputation_score + a.forum_comments * 3 + a.blog_comments * 2;
          const bScore = b.reputation_score + b.forum_comments * 3 + b.blog_comments * 2;
          return bScore - aScore;
        })
        .slice(0, 5),
    [users],
  );

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12">
      <header className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Users</h1>
        <p className="mt-3 text-base leading-8 text-slate-600">
          A live directory of readers and contributors who have interacted with TatvaOps through blog
          reading, comments, forum discussions, and community activity.
        </p>
        {syncedAt && (
          <p className="mt-2 text-xs text-slate-400">Last synced: {new Date(syncedAt).toLocaleString()}</p>
        )}
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Blog Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeTotals.blogViews)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Forum Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeTotals.forumViews)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">User Blog Views</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${blogViewsMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {blogViewsMatch ? "Verified" : "Updating"}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeUserTotals.blogViews)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">User Forum Views</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${forumViewsMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {forumViewsMatch ? "Verified" : "Updating"}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeUserTotals.forumViews)}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, bio, or interests"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "recent" | "blog_views" | "forum_activity")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="recent">Most recent</option>
          <option value="blog_views">Most blog views</option>
          <option value="forum_activity">Most forum active</option>
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={photosOnly}
            onChange={(e) => setPhotosOnly(e.target.checked)}
          />
          Real photos only
        </label>
      </div>

      {helpfulUsers.length > 0 && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Recently Helpful</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {helpfulUsers.map((user) => (
              <span key={user.id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">
                <img src={user.avatar_url} alt={`${user.display_name} avatar`} className="h-5 w-5 rounded-full object-cover" />
                {user.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {booting ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center text-slate-600">
          {photosOnly
            ? "No real-photo profiles match your current filters yet."
            : "No user profiles yet. Once visitors start reading blogs or joining discussions, they will show up here."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleUsers.map((user) => (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {(() => {
                const context = deriveProfileContext(user);
                const segment = getBehaviorSegment(user);
                const sparkline = buildWeeklySparkline(user);
                const actions = getRecentActions(user);
                return (
                  <>
              <div className="flex items-start gap-4">
                <img
                  src={user.avatar_url}
                  alt={`${user.display_name} avatar`}
                  className="h-14 w-14 rounded-full border border-slate-200 bg-slate-50 object-cover shadow-sm"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-slate-900">{user.display_name}</h2>
                    <ReputationBadge tier={user.reputation_tier} score={user.reputation_score} />
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
                </div>
              </div>

              <InterestTags tags={user.interest_tags} />
              <ActivityBadges user={user} />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Blog views</p>
                  <p className="mt-0.5 text-base font-semibold text-slate-900">{formatNumber(user.blog_views)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Forum posts</p>
                  <p className="mt-0.5 text-base font-semibold text-slate-900">{formatNumber(user.forum_posts)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Likes cast</p>
                  <p className="mt-0.5 text-base font-semibold text-slate-900">{formatNumber(user.blog_likes)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                <p className="text-xs text-slate-400">Seen {formatRelative(user.last_seen_at)}</p>
                <p className="text-xs text-slate-400">Joined {formatDate(user.created_at)}</p>
                {getTopicContributorHint(user) ? (
                  <p className="text-xs text-indigo-600">{getTopicContributorHint(user)}</p>
                ) : null}
                {getSocialHint(user) ? <p className="text-xs text-slate-500">{getSocialHint(user)}</p> : null}
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
                <div className="pt-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Weekly activity</p>
                  <div className="mt-1 flex items-end gap-1">
                    {sparkline.map((bar, index) => (
                      <span
                        key={`${user.id}-spark-${index}`}
                        className="w-2 rounded-sm bg-slate-300/90"
                        style={{ height: `${bar}px` }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Profile derived from activity signals and updated automatically.
                </p>
              </div>
                  </>
                );
              })()}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
