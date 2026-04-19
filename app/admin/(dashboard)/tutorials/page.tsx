import { requireAdminPageAccess } from "@/lib/adminAuth";
import Link from "next/link";

export const metadata = { title: "Tutorials Admin" };

async function fetchTutorials() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/tutorials?limit=50`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { tutorials?: unknown[] };
    return data.tutorials ?? [];
  } catch {
    return [];
  }
}

type Tutorial = {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
  published: boolean;
  estimated_minutes: number;
  created_at: string;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced:     "bg-red-50 text-red-600",
};

export default async function TutorialsAdminPage() {
  await requireAdminPageAccess();
  const tutorials = (await fetchTutorials()) as Tutorial[];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tutorials</h1>
          <p className="mt-0.5 text-sm text-slate-500">{tutorials.length} tutorials</p>
        </div>
        <Link
          href="/tutorials"
          target="_blank"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          View public page
        </Link>
      </div>

      {tutorials.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          No tutorials yet. Create the first one via the API or ingest pipeline.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tutorials.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-800">
                    {t.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_COLORS[t.difficulty] ?? "bg-slate-100 text-slate-600"}`}>
                      {t.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${t.published ? "text-emerald-600" : "text-slate-400"}`}>
                      {t.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.estimated_minutes}m</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(t.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/tutorials/${t.slug}`}
                      target="_blank"
                      className="text-xs text-sky-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
