import { requireAdminPageAccess } from "@/lib/adminAuth";
import Link from "next/link";
import { TutorialSortableList, type TutorialRow } from "@/components/admin/TutorialSortableList";

export const metadata = { title: "Tutorials Admin" };

async function fetchTutorials(): Promise<TutorialRow[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/tutorials?limit=200&sort=sort_order`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { tutorials?: TutorialRow[] };
    return data.tutorials ?? [];
  } catch {
    return [];
  }
}

async function fetchTutorialAnalytics(): Promise<{
  totals?: { totalTutorials: number; publishedTutorials: number; progressRows: number; completedRows: number };
  topTutorials?: Array<{ _id: string; started: number; completed: number; avgProgress: number }>;
}> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/tutorials/analytics`,
      { cache: "no-store" },
    );
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

type TutorialDraft = {
  _id: string;
  status: string;
  output_type: string;
  draft_type?: string;
  publish_target?: string;
  ai_title?: string;
  ai_excerpt?: string;
  created_at?: string;
};

async function fetchTutorialDrafts(): Promise<TutorialDraft[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/tutorials/drafts`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { drafts?: TutorialDraft[] };
    return data.drafts ?? [];
  } catch {
    return [];
  }
}

export default async function TutorialsAdminPage() {
  await requireAdminPageAccess();
  const [tutorials, analytics, tutorialDrafts] = await Promise.all([
    fetchTutorials(),
    fetchTutorialAnalytics(),
    fetchTutorialDrafts(),
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-app">Tutorials</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {tutorials.length} tutorials — drag rows to reorder
          </p>
        </div>
        <Link
          href="/tutorials"
          target="_blank"
          className="rounded-lg border border-app bg-surface px-4 py-2 text-sm font-medium text-slate-600 hover:bg-subtle transition"
        >
          View public page
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="ui-card rounded-lg p-3">
          <p className="text-xs text-muted">Tutorials</p>
          <p className="text-lg font-semibold text-app">{analytics.totals?.totalTutorials ?? 0}</p>
        </div>
        <div className="ui-card rounded-lg p-3">
          <p className="text-xs text-muted">Published</p>
          <p className="text-lg font-semibold text-app">{analytics.totals?.publishedTutorials ?? 0}</p>
        </div>
        <div className="ui-card rounded-lg p-3">
          <p className="text-xs text-muted">In Progress</p>
          <p className="text-lg font-semibold text-app">{analytics.totals?.progressRows ?? 0}</p>
        </div>
        <div className="ui-card rounded-lg p-3">
          <p className="text-xs text-muted">Completions</p>
          <p className="text-lg font-semibold text-app">{analytics.totals?.completedRows ?? 0}</p>
        </div>
      </div>

      {(analytics.topTutorials?.length ?? 0) > 0 && (
        <div className="mb-6 ui-card rounded-lg p-4">
          <h2 className="mb-2 text-sm font-semibold text-app">Top Tutorial Completion Performance</h2>
          <div className="space-y-2">
            {analytics.topTutorials?.slice(0, 6).map((row) => (
              <div key={row._id} className="flex items-center justify-between rounded-md border border-app bg-subtle px-3 py-2 text-xs">
                <span className="text-app">{row._id}</span>
                <span className="text-muted">
                  started {row.started} • completed {row.completed} • avg {Math.round(row.avgProgress)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 ui-card rounded-lg p-4">
        <h2 className="mb-2 text-sm font-semibold text-app">Tutorial AI Draft Queue</h2>
        {tutorialDrafts.length === 0 ? (
          <p className="text-xs text-muted">No pending tutorial ingestion drafts.</p>
        ) : (
          <div className="space-y-2">
            {tutorialDrafts.slice(0, 8).map((draft) => (
              <div key={draft._id} className="rounded-md border border-app bg-subtle px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-app">{draft.ai_title ?? "Untitled tutorial draft"}</p>
                  <span className="text-muted">
                    {draft.status} • {draft.draft_type ?? draft.output_type} → {draft.publish_target ?? "tutorials"}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {draft.ai_excerpt ?? "AI draft is being prepared. Open ingestion queue to review full content and publish."}
                </p>
                <div className="mt-2">
                  <Link href="/admin/ingest" className="text-[11px] font-medium text-sky-600 hover:underline">
                    Open ingestion queue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tutorials.length === 0 ? (
        <div className="rounded-xl border border-app bg-surface p-10 text-center text-slate-400">
          No tutorials yet. Create the first one via the API or ingest pipeline.
        </div>
      ) : (
        <TutorialSortableList initialTutorials={tutorials} />
      )}
    </div>
  );
}
