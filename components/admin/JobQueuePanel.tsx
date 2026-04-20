"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobStatus, JobType } from "@/models/GenerationJob";
// JobStatus and JobType are re-exported string union types — no runtime import needed.

type JobRow = {
  _id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Props = {
  /** Re-fetch when this ticks (parent increments after triggering a new job) */
  refreshTick: number;
};

const TYPE_LABEL: Record<JobType, string> = {
  generate_forums: "Generate Forums",
  autopopulate: "Autopopulate",
  generate_blogs: "Generate Blogs",
};

const STATUS_STYLES: Record<JobStatus, string> = {
  pending:   "bg-amber-100 text-amber-800",
  running:   "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed:    "bg-red-100 text-red-800",
};

const formatDuration = (startedAt: string | null, completedAt: string | null): string => {
  if (!startedAt) return "—";
  const end = completedAt ? new Date(completedAt) : new Date();
  const ms = end.getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC",
  }).format(new Date(iso));

export function JobQueuePanel({ refreshTick }: Props) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: JobRow[] };
      setJobs(data.jobs);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when parent triggers a new job
  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs, refreshTick]);

  // Auto-refresh while any job is active
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "pending" || j.status === "running");
    if (!hasActive) return;
    const id = setInterval(() => void fetchJobs(), 1500);
    return () => clearInterval(id);
  }, [jobs, fetchJobs]);

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-app bg-surface p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No generation jobs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-app bg-surface shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-subtle">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Progress</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Result</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Duration</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job._id} className="hover:bg-subtle">
              <td className="px-4 py-2.5 font-medium text-slate-800">{TYPE_LABEL[job.type]}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[job.status]}`}>
                  {job.status === "running" && (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                  )}
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {job.status === "running" ? (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-xs text-slate-500">{job.progress}%</span>
                  </div>
                ) : job.status === "completed" ? (
                  <span className="text-xs text-slate-400">100%</span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600">
                {job.status === "completed" && job.result ? (
                  <span>
                    {String(job.result.created ?? 0)} created
                    {Number(job.result.skipped) > 0 ? ` · ${String(job.result.skipped)} skipped` : ""}
                    {Number(job.result.failed) > 0 ? ` · ${String(job.result.failed)} failed` : ""}
                  </span>
                ) : job.status === "failed" && job.error ? (
                  <span className="text-red-600" title={job.error}>
                    {job.error.slice(0, 60)}{job.error.length > 60 ? "…" : ""}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-xs text-slate-500">
                {formatDuration(job.started_at, job.completed_at)}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-xs text-slate-500">
                {formatTime(job.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
