import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/adminAuth";
import { getVideoPosts } from "@/lib/videoService";
import { AdminVideoTable } from "@/components/admin/AdminVideoTable";

export const revalidate = 0;

export default async function AdminVideosPage() {
  await requireAdminPageAccess();

  let posts: Awaited<ReturnType<typeof getVideoPosts>>["posts"] = [];
  let total = 0;

  try {
    const result = await getVideoPosts({ sort: "new", limit: 50, includeUnpublished: true });
    posts = result.posts;
    total = result.total;
  } catch {
    // render empty state
  }

  const published = posts.filter((p) => p.published).length;
  const drafts = posts.length - published;

  return (
    <div className="min-h-full bg-subtle">
      <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-app">Videos</h1>
            <p className="text-sm text-slate-500">Short-form video content for the Shorts feed</p>
          </div>
          <Link
            href="/shorts"
            target="_blank"
            className="rounded-lg border border-app bg-surface px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:text-app"
          >
            View Shorts →
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {[
            { label: "Total videos", value: total, accent: "text-app", sub: "text-slate-500" },
            { label: "Published", value: published, accent: "text-emerald-700", sub: "text-emerald-600" },
            { label: "Drafts", value: drafts, accent: "text-amber-700", sub: "text-amber-600" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-app bg-surface p-4">
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${card.sub}`}>{card.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* How-to note */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          <strong>No placeholders.</strong> Only videos with a valid YouTube video ID or direct video URL will be served to users.
          Use the "Generate YouTube search suggestions" button to find relevant construction videos to add.
        </div>

        {/* Table */}
        <AdminVideoTable initialPosts={posts} />
      </div>
    </div>
  );
}
