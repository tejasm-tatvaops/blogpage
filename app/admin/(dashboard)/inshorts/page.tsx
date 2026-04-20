import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/adminAuth";

export default async function AdminInshortsPage() {
  await requireAdminPageAccess();

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tatva Inshorts</h1>
          <p className="text-sm text-slate-500">
            Tatva Inshorts is powered by forum posts. Manage content via the Forums admin.
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          Tatva Inshorts at <strong>/inshorts</strong> displays forum discussions as immersive swipe cards.
          To manage content, create or moderate forum posts below.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/admin/forums"
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition"
          >
            <p className="text-sm font-semibold text-slate-900">Forums Admin</p>
            <p className="text-xs text-slate-500">Manage posts that appear in Tatva Inshorts</p>
          </Link>
          <Link
            href="/inshorts"
            target="_blank"
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition"
          >
            <p className="text-sm font-semibold text-slate-900">View Tatva Inshorts →</p>
            <p className="text-xs text-slate-500">Preview the live /inshorts page</p>
          </Link>
          <Link
            href="/admin/stats"
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition"
          >
            <p className="text-sm font-semibold text-slate-900">Analytics</p>
            <p className="text-xs text-slate-500">View feed events and engagement signals</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
