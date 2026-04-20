"use client";

import { useEffect, useMemo, useState } from "react";

type InteractiveBlock = {
  block_id: string;
  type: "quiz" | "exercise" | "challenge";
  title: string;
  prompt: string;
  options?: string[];
  answer_index?: number | null;
  explanation?: string | null;
};

export function InteractiveBlocks({
  slug,
  blocks,
}: {
  slug: string;
  blocks: InteractiveBlock[];
}) {
  const [completedStepKeys, setCompletedStepKeys] = useState<string[]>([]);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const completedSet = useMemo(() => new Set(completedStepKeys), [completedStepKeys]);

  useEffect(() => {
    let active = true;
    const loadProgress = async () => {
      try {
        const res = await fetch(`/api/tutorials/${encodeURIComponent(slug)}/progress`, { cache: "no-store" });
        const data = (await res.json()) as { progress?: { completedStepKeys?: string[] } };
        if (active) setCompletedStepKeys(data.progress?.completedStepKeys ?? []);
      } catch {
        if (active) setCompletedStepKeys([]);
      }
    };
    void loadProgress();
    return () => {
      active = false;
    };
  }, [slug]);

  const markBlockComplete = async (blockId: string) => {
    const stepKey = `block:${blockId.toLowerCase()}`;
    setWorkingKey(stepKey);
    try {
      const res = await fetch(`/api/tutorials/${encodeURIComponent(slug)}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step", step_key: stepKey }),
      });
      if (res.ok) {
        setCompletedStepKeys((prev) => (prev.includes(stepKey) ? prev : [...prev, stepKey]));
      }
    } finally {
      setWorkingKey(null);
    }
  };

  if (blocks.length === 0) return null;

  return (
    <section className="my-8 space-y-4">
      <h2 className="text-lg font-semibold text-app">Interactive Exercises</h2>
      {blocks.map((block) => {
        const stepKey = `block:${block.block_id.toLowerCase()}`;
        const isComplete = completedSet.has(stepKey);
        const isWorking = workingKey === stepKey;
        return (
          <div key={block.block_id} className="rounded-xl border border-app bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 capitalize">
                {block.type}
              </span>
              <h3 className="text-sm font-semibold text-app">{block.title}</h3>
            </div>
            <p className="text-sm text-slate-600">{block.prompt}</p>
            {Array.isArray(block.options) && block.options.length > 0 && (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                {block.options.map((opt) => (
                  <li key={opt}>{opt}</li>
                ))}
              </ul>
            )}
            {block.explanation && (
              <p className="mt-3 rounded-md bg-subtle px-3 py-2 text-xs text-slate-500">
                Hint: {block.explanation}
              </p>
            )}
            <button
              type="button"
              disabled={isComplete || isWorking}
              onClick={() => void markBlockComplete(block.block_id)}
              className="mt-3 min-h-10 rounded-md border border-app bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isComplete ? "Completed" : isWorking ? "Saving..." : "Mark exercise complete"}
            </button>
          </div>
        );
      })}
    </section>
  );
}
