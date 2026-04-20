"use client";

import { useEffect, useState } from "react";

type Progress = {
  completionPercent: number;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
  completedStepKeys?: string[];
};

export function TutorialProgressCard({
  slug,
  onProgressChange,
}: {
  slug: string;
  onProgressChange?: (progress: Progress | null) => void;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tutorials/${encodeURIComponent(slug)}/progress`, { cache: "no-store" });
        const data = (await res.json()) as { progress?: Progress };
        if (active) {
          setProgress(data.progress ?? null);
          onProgressChange?.(data.progress ?? null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  const markComplete = async () => {
    setWorking(true);
    try {
      await fetch(`/api/tutorials/${encodeURIComponent(slug)}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      setProgress((prev) =>
        prev
          ? { ...prev, completed: true, completionPercent: 100, completedSteps: Math.max(prev.totalSteps, prev.completedSteps) }
          : { completionPercent: 100, completed: true, totalSteps: 1, completedSteps: 1 },
      );
      onProgressChange?.({
        completionPercent: 100,
        completed: true,
        totalSteps: Math.max(progress?.totalSteps ?? 1, progress?.completedSteps ?? 1),
        completedSteps: Math.max(progress?.totalSteps ?? 1, progress?.completedSteps ?? 1),
        completedStepKeys: progress?.completedStepKeys ?? [],
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="ui-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app">Your Progress</p>
          <p className="text-xs text-muted">
            {loading ? "Checking progress..." : progress ? `${progress.completedSteps}/${progress.totalSteps} steps` : "Not started yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={markComplete}
          disabled={working || Boolean(progress?.completed)}
          className="ui-btn-primary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {progress?.completed ? "Completed" : working ? "Saving..." : "Mark completed"}
        </button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress?.completionPercent ?? 0))}%` }}
        />
      </div>
    </div>
  );
}
