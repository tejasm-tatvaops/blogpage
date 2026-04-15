import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getStats } from "@/lib/blogService";
import SendDigestButton from "@/components/admin/SendDigestButton";

export const revalidate = 0;

const fmt = (n: number) => n.toLocaleString();

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );

export default async function AdminStatsPage() {
  await requireAdminPageAccess();

  let stats;
  try {
    stats = await getStats();
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Failed to load stats.
      </div>
    );
  }

  const statCards = [
    { label: "Total posts", value: fmt(stats.totalPosts), color: "bg-slate-50 text-slate-700" },
    { label: "Published", value: fmt(stats.publishedPosts), color: "bg-emerald-50 text-emerald-700" },
    { label: "Drafts", value: fmt(stats.draftPosts), color: "bg-amber-50 text-amber-700" },
    { label: "Total views", value: fmt(stats.totalViews), color: "bg-sky-50 text-sky-700" },
    { label: "Upvotes", value: fmt(stats.totalUpvotes), color: "bg-indigo-50 text-indigo-700" },
    { label: "Downvotes", value: fmt(stats.totalDownvotes), color: "bg-rose-50 text-rose-700" },
  ];
  const maxViewsInWindow = Math.max(1, ...stats.viewsByDay.map((item) => item.views));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </Link>
            <span className="h-5 w-px bg-slate-200" />
            <h1 className="text-sm font-semibold text-slate-800">Analytics</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border border-slate-200 p-4 ${card.color}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Views trend (14 days)
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="flex h-44 items-end gap-2">
                {stats.viewsByDay.map((point) => {
                  const heightPercent = Math.max(6, Math.round((point.views / maxViewsInWindow) * 100));
                  return (
                    <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-sky-500/80" style={{ height: `${heightPercent}%` }} />
                      <span className="text-[10px] text-slate-400">{point.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Traffic sources (14 days)
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.referrerSources.map((source) => (
                <li key={source.source} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="truncate text-slate-700">{source.source}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {fmt(source.views)}
                  </span>
                </li>
              ))}
              {stats.referrerSources.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-400">No traffic source data yet</li>
              )}
            </ul>
          </div>

          {/* ── Top by views ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Top posts by views
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.topByViews.map((post, i) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-center text-xs font-bold text-slate-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="block truncate text-sm font-medium text-slate-800 hover:text-sky-600"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-400">{formatDate(post.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                    {fmt(post.view_count)}
                  </span>
                </li>
              ))}
              {stats.topByViews.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-400">No data yet</li>
              )}
            </ul>
          </div>

          {/* ── Top by upvotes ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Top posts by upvotes
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.topByUpvotes.map((post, i) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-center text-xs font-bold text-slate-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="block truncate text-sm font-medium text-slate-800 hover:text-sky-600"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-400">{formatDate(post.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {fmt(post.upvote_count)} ▲
                  </span>
                </li>
              ))}
              {stats.topByUpvotes.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-400">No data yet</li>
              )}
            </ul>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Newsletter automation
            </p>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Send a curated digest to all active subscribers using the latest published posts.
            </p>
            <SendDigestButton />
          </div>
        </div>

        {/* ── Recent posts ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Recently published
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {stats.recentPosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="block truncate text-sm font-medium text-slate-800 hover:text-sky-600"
                  >
                    {post.title}
                  </Link>
                  <p className="text-xs text-slate-400">{post.category} · {formatDate(post.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{fmt(post.view_count)} views</span>
                  <span>{fmt(post.upvote_count)} ▲</span>
                  <Link
                    href={`/admin/blog/edit/${post.id}`}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium transition hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
            {stats.recentPosts.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-slate-400">No posts yet</li>
            )}
          </ul>
        </div>

      </div>
    </div>
  );
}
