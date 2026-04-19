import { notFound } from "next/navigation";
import { getRevisionsForBlog } from "@/lib/revisionService";
import { getPostBySlug } from "@/lib/blogService";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Revision History — ${decodeURIComponent(slug)}` };
}

type Revision = {
  _id: { toString(): string };
  status: string;
  proposer_display_name: string;
  reviewer_display_name: string | null;
  edit_summary: string | null;
  reviewer_note: string | null;
  version_number: number | null;
  is_live: boolean;
  created_at: Date;
  reviewed_at: Date | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  approved:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:   "bg-red-50 text-red-600 border-red-200",
  rolled_back:"bg-slate-100 text-slate-600 border-slate-200",
};

export default async function RevisionHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const [blog, revisions] = await Promise.all([
    getPostBySlug(decodedSlug).catch(() => null),
    getRevisionsForBlog(decodedSlug, 50),
  ]);

  if (!blog) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <a href={`/blog/${decodedSlug}`} className="text-sm text-sky-600 hover:underline">
          ← Back to article
        </a>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Revision History</h1>
        <p className="mt-1 text-sm text-slate-500">
          {(blog as unknown as { title: string }).title}
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {revisions.length} revision{revisions.length !== 1 ? "s" : ""}
        </p>
        <a
          href={`/blog/${decodedSlug}/suggest-edit`}
          className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 transition"
        >
          + Suggest Edit
        </a>
      </div>

      {revisions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          No revisions yet. Be the first to suggest an improvement.
        </div>
      ) : (
        <ol className="relative border-l border-slate-200">
          {(revisions as unknown as Revision[]).map((rev) => (
            <li key={rev._id.toString()} className="mb-6 ml-5">
              <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                {rev.is_live ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                )}
              </span>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      STATUS_BADGE[rev.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {rev.status.replace("_", " ")}
                  </span>
                  {rev.version_number && (
                    <span className="text-xs text-slate-400">v{rev.version_number}</span>
                  )}
                  {rev.is_live && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Live
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-medium text-slate-800">
                  {rev.edit_summary ?? "No summary provided"}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500">
                  <span>
                    Proposed by{" "}
                    <span className="font-medium text-slate-700">{rev.proposer_display_name}</span>
                  </span>
                  <span>
                    {new Date(rev.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>

                {rev.reviewer_display_name && (
                  <p className="mt-1 text-xs text-slate-500">
                    Reviewed by{" "}
                    <span className="font-medium text-slate-700">{rev.reviewer_display_name}</span>
                    {rev.reviewer_note ? ` — "${rev.reviewer_note}"` : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
