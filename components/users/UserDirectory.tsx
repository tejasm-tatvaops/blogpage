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
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500 line-clamp-2">{user.about}</p>
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
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
