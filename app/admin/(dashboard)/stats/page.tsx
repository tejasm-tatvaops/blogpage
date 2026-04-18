import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getStats } from "@/lib/blogService";
import SendDigestButton from "@/components/admin/SendDigestButton";
import AdminObservabilityDashboard from "@/components/admin/AdminObservabilityDashboard";

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
    { label: "Total posts", value: fmt(stats.totalPosts), accent: "text-slate-900", sub: "text-slate-500" },
    { label: "Published", value: fmt(stats.publishedPosts), accent: "text-emerald-700", sub: "text-emerald-600" },
    { label: "Drafts", value: fmt(stats.draftPosts), accent: "text-amber-700", sub: "text-amber-600" },
    { label: "Total views", value: fmt(stats.totalViews), accent: "text-sky-700", sub: "text-sky-600" },
    { label: "Upvotes", value: fmt(stats.totalUpvotes), accent: "text-violet-700", sub: "text-violet-600" },
    { label: "Downvotes", value: fmt(stats.totalDownvotes), accent: "text-red-700", sub: "text-red-600" },
  ];
  const maxViewsInWindow = Math.max(1, ...stats.viewsByDay.map((item) => item.views));

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">Platform performance overview</p>
        </div>
        <AdminObservabilityDashboard />

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${card.sub}`}>
                {card.label}
              </p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Views trend (14 days)
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="flex h-40 items-end gap-1.5">
                {stats.viewsByDay.map((point) => {
                  const heightPercent = Math.max(4, Math.round((point.views / maxViewsInWindow) * 100));
                  return (
                    <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-sky-500/60 transition-colors hover:bg-sky-500/80" style={{ height: `${heightPercent}%` }} />
                      <span className="text-[9px] text-slate-500">{point.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Traffic sources (14 days)
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.referrerSources.map((source) => (
                <li key={source.source} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="truncate text-slate-600">{source.source}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                    {fmt(source.views)}
                  </span>
                </li>
              ))}
              {stats.referrerSources.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">No traffic source data yet</li>
              )}
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Top posts by views</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.topByViews.map((post, i) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/blog/${post.slug}`} target="_blank" className="block truncate text-sm text-slate-700 hover:text-violet-700">
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-sky-700">
                    {fmt(post.view_count)}
                  </span>
                </li>
              ))}
              {stats.topByViews.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">No data yet</li>
              )}
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Top posts by upvotes</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {stats.topByUpvotes.map((post, i) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/blog/${post.slug}`} target="_blank" className="block truncate text-sm text-slate-700 hover:text-violet-700">
                      {post.title}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDate(post.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-700">
                    {fmt(post.upvote_count)} ▲
                  </span>
                </li>
              ))}
              {stats.topByUpvotes.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-slate-500">No data yet</li>
              )}
            </ul>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Newsletter automation</p>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Send a curated digest to all active subscribers using the latest published posts.
            </p>
            <SendDigestButton />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Recently published</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {stats.recentPosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/blog/${post.slug}`} target="_blank" className="block truncate text-sm text-slate-700 hover:text-violet-700">
                    {post.title}
                  </Link>
                  <p className="text-xs text-slate-500">{post.category} · {formatDate(post.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="tabular-nums">{fmt(post.view_count)} views</span>
                  <span className="tabular-nums">{fmt(post.upvote_count)} ▲</span>
                  <Link
                    href={`/admin/blog/edit/${post.id}`}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
            {stats.recentPosts.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-slate-500">No posts yet</li>
            )}
          </ul>
        </div>

      </div>
    </div>
  );
}
