"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AskAiMode, AskSourceType } from "@/lib/askContext";
import { buildAskHref } from "@/lib/askContext";
import { rankIntelligencePrompts } from "@/lib/askPromptRanking";

type ChipPrompt = {
  label: string;
  prompt: string;
  aiMode: AskAiMode;
};

export function InlineIntelligenceChips({
  title,
  anchor,
  sourceType,
  page,
  prompts,
  context = {},
  compact = false,
}: {
  title?: string;
  anchor: string;
  sourceType: AskSourceType;
  page: string;
  prompts: ChipPrompt[];
  context?: {
    journal?: string;
    week?: string;
    city?: string;
    risks?: string;
    tags?: string;
    discussions?: string;
    expertise?: string;
    userIntent?: string;
  };
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 768) setViewport("mobile");
      else if (w < 1200) setViewport("tablet");
      else setViewport("desktop");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const ranked = useMemo(
    () =>
      rankIntelligencePrompts({
        prompts,
        sourceType,
        page,
        context: {
          risks: context?.risks,
          tags: context?.tags,
          discussions: context?.discussions,
          userIntent: context?.userIntent ?? (context?.journal ? `journal ${context.journal}` : ""),
        },
      }),
    [context?.discussions, context?.journal, context?.risks, context?.tags, page, prompts, sourceType],
  );

  const collapsedCount = viewport === "mobile" ? 3 : viewport === "tablet" ? 5 : ranked.length;
  const visiblePrompts = expanded || viewport === "desktop" ? ranked : ranked.slice(0, collapsedCount);
  const hasOverflow = ranked.length > collapsedCount && viewport !== "desktop";

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      {title ? <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{title}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {visiblePrompts.map((item) => (
          <Link
            key={item.label}
            href={buildAskHref({
              prompt: item.prompt,
              anchor,
              sourceType,
              aiMode: item.aiMode,
              page,
              intent: item.prompt,
              ...context,
            })}
            className={
              item.tier === "primary"
                ? "rounded-full border border-orange-200/70 bg-orange-50/45 px-2.5 py-1 text-[11px] text-app transition hover:underline hover:decoration-orange-300"
                : "rounded-full border border-app/70 bg-subtle px-2.5 py-1 text-[11px] text-muted transition hover:underline hover:decoration-orange-200 hover:text-app"
            }
          >
            {item.label}
          </Link>
        ))}
        {hasOverflow ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-full border border-app/70 bg-surface px-2.5 py-1 text-[11px] text-muted transition hover:border-orange-200 hover:text-app"
          >
            {expanded ? "less" : `+${ranked.length - collapsedCount} more intelligence prompts`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
