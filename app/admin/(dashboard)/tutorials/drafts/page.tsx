import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/adminAuth";

type TutorialDraft = {
  _id: string;
  status: string;
  ai_title?: string;
  ai_excerpt?: string;
  draft_type?: string;
  publish_target?: string;
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

export const metadata = { title: "Tutorial Draft Review" };

export default async function TutorialDraftReviewPage() {
  await requireAdminPageAccess();
  const drafts = await fetchTutorialDrafts();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-app">Tutorial Draft Review</h1>
          <p className="mt-1 text-sm text-muted">
            AI-generated tutorial drafts before publish. Review/edit in ingestion queue.
          </p>
        </div>
        <Link href="/admin/ingest" className="rounded-lg border border-app bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-subtle">
          Open Ingestion Queue
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="ui-card rounded-xl p-8 text-center text-sm text-muted">
          No tutorial drafts pending review.
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div key={draft._id} className="ui-card rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-app">{draft.ai_title ?? "Untitled tutorial draft"}</h2>
                <span className="text-xs text-muted">
                  {draft.status} • {draft.draft_type ?? "tutorial"} → {draft.publish_target ?? "tutorials"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{draft.ai_excerpt ?? "No excerpt yet."}</p>
              <p className="mt-2 text-[11px] text-faint">
                {draft.created_at ? new Date(draft.created_at).toLocaleString() : "Unknown created time"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
