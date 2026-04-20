import { requireAdminPageAccess } from "@/lib/adminAuth";

export const metadata = { title: "Review Queue" };

async function getPendingRevisions() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/review-queue?limit=50`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { revisions?: unknown[] };
    return data.revisions ?? [];
  } catch {
    return [];
  }
}

type Revision = {
  _id: string;
  blog_slug: string;
  proposer_display_name: string;
  edit_summary: string | null;
  created_at: string;
  status: string;
};

export default async function ReviewQueuePage() {
  await requireAdminPageAccess();
  const revisions = (await getPendingRevisions()) as Revision[];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-app">Revision Review Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Proposed article edits awaiting review. Only Expert+ users and admins can approve.
        </p>
      </div>

      {revisions.length === 0 ? (
        <div className="rounded-xl border border-app bg-surface p-10 text-center text-slate-400">
          No pending revisions. All caught up.
        </div>
      ) : (
        <div className="space-y-3">
          {revisions.map((rev) => (
            <div
              key={rev._id}
              className="flex items-center justify-between rounded-xl border border-app bg-surface px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  <span className="text-slate-500">Blog:</span>{" "}
                  <a
                    href={`/blog/${rev.blog_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:underline"
                  >
                    {rev.blog_slug}
                  </a>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  By <span className="font-medium text-slate-700">{rev.proposer_display_name}</span>
                  {rev.edit_summary ? ` — "${rev.edit_summary}"` : ""}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(rev.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <a
                  href={`/blog/${rev.blog_slug}/revisions`}
                  className="rounded-lg border border-app bg-surface px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-subtle"
                >
                  View Diff
                </a>
                <form
                  action={`/api/admin/review-queue`}
                  method="POST"
                  className="inline"
                >
                  <input type="hidden" name="action" value="approve" />
                  <input type="hidden" name="revision_id" value={rev._id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                </form>
                <form action="/api/admin/review-queue" method="POST" className="inline">
                  <input type="hidden" name="action" value="reject" />
                  <input type="hidden" name="revision_id" value={rev._id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
