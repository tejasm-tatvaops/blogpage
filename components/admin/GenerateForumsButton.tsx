"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JobStatus = "idle" | "pending" | "running" | "completed" | "failed";

type JobPollResponse = {
  status: JobStatus;
  progress: number;
  result?: { created: number; skipped: number; failed: number; elapsedMs: number };
  error?: string | null;
};

type Props = {
  onComplete: (result: { created: number; skipped: number; failed: number; elapsedMs: number }) => void;
};

const POLL_INTERVAL_MS = 1500;

export function GenerateForumsButton({ onComplete }: Props) {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      intervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" });
          if (!res.ok) return;
          const job = (await res.json()) as JobPollResponse;
          setProgress(job.progress ?? 0);
          setStatus(job.status);
          if (job.status === "completed") {
            stopPolling();
            onComplete(
              job.result ?? { created: 0, skipped: 0, failed: 0, elapsedMs: 0 },
            );
          }
          if (job.status === "failed") {
            stopPolling();
            setError(job.error ?? "Generation failed.");
          }
        } catch {
          // transient fetch error — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [onComplete, stopPolling],
  );

  // Clean up on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const trigger = async () => {
    if (status === "pending" || status === "running") return;
    setError(null);
    setProgress(0);
    setStatus("pending");

    try {
      const res = await fetch("/api/admin/generate-forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to start generation.");
      }
      jobIdRef.current = data.jobId;
      setStatus("running");
      startPolling(data.jobId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Failed to start generation.");
    }
  };

  const isActive = status === "pending" || status === "running";

  const label = () => {
    if (status === "pending") return "Starting…";
    if (status === "running") return `Generating… ${progress}%`;
    if (status === "completed") return "Done ✓";
    if (status === "failed") return "Failed — retry";
    return "Generate Forums";
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={trigger}
        disabled={isActive}
        className="relative overflow-hidden rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {/* progress bar fill */}
        {isActive && (
          <span
            className="absolute inset-y-0 left-0 bg-indigo-500/40 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        <span className="relative">{label()}</span>
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
