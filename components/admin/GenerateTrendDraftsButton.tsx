"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "idle" | "pending" | "running" | "completed" | "failed";
type JobPollResponse = {
  status: JobStatus;
  progress: number;
  result?: { created: number; skipped: number; failed: number };
  error?: string | null;
};

const POLL_INTERVAL_MS = 1500;

export function GenerateTrendDraftsButton() {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" });
        if (!res.ok) return;
        const job = (await res.json()) as JobPollResponse;
        setStatus(job.status);
        setProgress(job.progress ?? 0);
        if (job.status === "completed") {
          stopPolling();
          router.refresh();
        }
        if (job.status === "failed") {
          stopPolling();
          setError(job.error ?? "Draft generation failed.");
        }
      } catch {
        // keep polling on transient issues
      }
    }, POLL_INTERVAL_MS);
  }, [router, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const trigger = async () => {
    if (status === "pending" || status === "running") return;
    setError(null);
    setProgress(0);
    setStatus("pending");
    try {
      const res = await fetch("/api/admin/tutorials/trend-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to start trend draft generation.");
      }
      setStatus("running");
      startPolling(data.jobId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to start trend draft generation.");
    }
  };

  const isActive = status === "pending" || status === "running";
  const label =
    status === "pending"
      ? "Starting…"
      : status === "running"
        ? `Generating trend drafts… ${progress}%`
        : status === "completed"
          ? "Trend drafts ready ✓"
          : status === "failed"
            ? "Failed — retry"
            : "Generate From Forum Trends";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={trigger}
        disabled={isActive}
        className="relative overflow-hidden rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isActive && (
          <span
            className="absolute inset-y-0 left-0 bg-violet-500/40 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        <span className="relative">{label}</span>
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

