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

export default async function TutorialsAdminPage() {
  await requireAdminPageAccess();
  const tutorials = await fetchTutorials();

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
