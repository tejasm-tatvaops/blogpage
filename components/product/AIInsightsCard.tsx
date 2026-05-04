"use client";

import { useState } from "react";
import type { AIInsightsCardProps, AIInsightsConfidence, AIInsightsState } from "@/lib/product/aiInsights";
import { cn } from "@/lib/cn";

export type { AIInsightsCardProps, AIInsightsConfidence, AIInsightsState } from "@/lib/product/aiInsights";

const EARLY_INTRO_PRODUCT =
  "Initial signals from recent threads are directional only—insights will sharpen as more builders and estimators contribute.";
const EARLY_INTRO_TOPIC =
  "Cross-content signals for this topic are still forming—treat these notes as directional until more blogs and forum threads accumulate.";

function confidenceLabel(c: AIInsightsConfidence): string | null {
  if (c === "none") return null;
  const labels: Record<Exclude<AIInsightsConfidence, "none">, string> = {
    low: "Low confidence",
    medium: "Medium confidence",
    high: "High confidence",
  };
  return labels[c];
}

function dataProvenance(count: number, state: AIInsightsState, variant: "product" | "topic"): string {
  if (variant === "topic") {
    if (state === "empty") return "Based on limited data";
    if (state === "early") {
      return count === 1
        ? "Based on 1 signal — limited data"
        : `Based on ${count} signals — limited data`;
    }
    return `Based on ${count} signals`;
  }
  if (state === "empty") return "Based on limited data";
  if (state === "early") {
    return count === 1
      ? "Based on 1 discussion — limited data"
      : `Based on ${count} discussions — limited data`;
  }
  return `Based on ${count} discussion${count !== 1 ? "s" : ""}`;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-green-600 dark:text-green-400", className)}
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-orange-600 dark:text-orange-400", className)}
      aria-hidden
    >
      <path
        d="M12 3 2 21h20L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeaderIcon() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-500/35 dark:bg-sky-500/15 dark:ring-sky-400/30"
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-sky-600 dark:text-sky-300">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function EmptyShimmer() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-4 max-w-[92%] animate-pulse rounded-md bg-black/[0.08] dark:bg-white/[0.12]" />
      <div className="h-4 max-w-[78%] animate-pulse rounded-md bg-black/[0.08] dark:bg-white/[0.12]" />
      <div className="h-4 max-w-[85%] animate-pulse rounded-md bg-black/[0.08] dark:bg-white/[0.12]" />
      <div className="h-4 max-w-[64%] animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
    </div>
  );
}

function ExpandableInsightColumn({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "green" | "orange";
}) {
  const [expanded, setExpanded] = useState(false);
  const initial = 2;
  const hasMore = items.length > initial;
  const visible = expanded ? items : items.slice(0, initial);

  const expandBtn =
    variant === "green"
      ? "text-green-800 underline-offset-2 hover:underline dark:text-green-300"
      : "text-orange-800 underline-offset-2 hover:underline dark:text-orange-300";

  const shell =
    variant === "green"
      ? "rounded-[14px] border border-green-500/20 bg-green-500/10 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      : "rounded-[14px] border border-orange-500/20 bg-orange-500/10 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  const heading =
    variant === "green"
      ? "text-[11px] font-bold uppercase tracking-wider text-green-800 dark:text-green-300"
      : "text-[11px] font-bold uppercase tracking-wider text-orange-900 dark:text-orange-200";

  const iconWrap =
    variant === "green"
      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/25 dark:bg-green-500/15 dark:ring-green-400/30"
      : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 ring-1 ring-orange-500/25 dark:bg-orange-500/15 dark:ring-orange-400/30";

  return (
    <div className={shell}>
      <h3 className={cn("mb-3", heading)}>{title}</h3>
      <ul className="space-y-3">
        {visible.map((line, i) => (
          <li key={`${line}-${i}`} className="flex gap-3 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
            <span className={iconWrap}>
              {variant === "green" ? <CheckIcon /> : <AlertIcon />}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn("mt-4 text-left text-xs font-semibold transition", expandBtn)}
        >
          {expanded ? "Show less" : `Show ${items.length - initial} more`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Always-on AI insights surface for product hubs. Never returns null—use `state` for content variants.
 */
export function AIInsightsCard({
  productName,
  discussionCount,
  state,
  confidence,
  positives = [],
  cautions = [],
  earlyInsights = [],
  variant = "product",
}: AIInsightsCardProps) {
  const conf = confidenceLabel(confidence);
  const provenance = dataProvenance(discussionCount, state, variant);
  const isTopic = variant === "topic";
  const mainTitle = isTopic ? "Market Insights" : "Brand Insights";
  const subtitle = isTopic
    ? "AI-powered synthesis across blogs and forum discussions for this topic"
    : "AI-powered analysis of market signals";
  const leftColumnTitle = isTopic ? "Key trends" : "Why Buyers Choose This Brand";
  const rightColumnTitle = isTopic
    ? `What people are discussing about ${productName}`
    : "Points to Consider";
  const earlyChip = isTopic ? "Early signals" : "Early Insights";
  const earlyIntro = isTopic ? EARLY_INTRO_TOPIC : EARLY_INTRO_PRODUCT;
  const emptyBody = isTopic
    ? "No discussions yet. AI insights will appear once users start engaging."
    : "No discussions yet. AI insights will appear once users start engaging with this product.";

  const outer = cn(
    "tatva-insights-fade-up relative mb-8 rounded-[18px] p-5 backdrop-blur-[10px] sm:p-6 md:mb-10",
    /* Light: strong elevated surface */
    "border border-black/10 bg-white/95 shadow-[0_10px_36px_rgba(0,0,0,0.12)]",
    /* Dark: deep glass (design spec) */
    "dark:border-white/10 dark:bg-[rgba(12,14,36,0.6)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
    state === "empty" && "opacity-95 dark:opacity-90",
    state === "early" &&
      "ring-1 ring-orange-500/25 shadow-[0_10px_36px_rgba(0,0,0,0.1)] dark:ring-orange-400/20 dark:shadow-[0_8px_28px_rgba(0,0,0,0.35)]",
    state === "full" &&
      "ring-1 ring-black/[0.08] shadow-[0_14px_44px_rgba(0,0,0,0.14)] dark:ring-white/10 dark:shadow-[0_12px_48px_rgba(0,0,0,0.55)]",
  );

  return (
    <section
      className={outer}
      aria-labelledby="ai-insights-title"
      aria-label={isTopic ? `Market insights for ${productName}` : `Brand insights for ${productName}`}
    >
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <HeaderIcon />
        <div className="min-w-0 flex-1">
          <h2 id="ai-insights-title" className="text-lg font-bold tracking-tight text-app sm:text-xl">
            {mainTitle}
          </h2>
          <p className="mt-1 text-sm text-muted dark:text-white/70">{subtitle}</p>
          <p className="mt-2 text-xs font-semibold text-muted dark:text-white/55">{provenance}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          {conf ? (
            <span className="rounded-full border border-black/10 bg-black/[0.04] px-3 py-1 text-[11px] font-semibold text-muted dark:border-white/15 dark:bg-white/10 dark:text-white/85">
              {conf}
            </span>
          ) : null}
        </div>
      </div>

      {state === "empty" ? (
        <div className="opacity-80">
          <div className="rounded-[14px] border border-dashed border-black/15 bg-black/[0.03] px-4 py-6 dark:border-white/15 dark:bg-white/[0.04] sm:px-6">
            <p className="text-sm leading-relaxed text-muted dark:text-white/75">{emptyBody}</p>
            <div className="mt-5">
              <EmptyShimmer />
            </div>
          </div>
        </div>
      ) : null}

      {state === "early" ? (
        <div className="max-w-full rounded-[14px] border border-orange-500/20 bg-orange-500/10 p-4 sm:p-5 dark:border-orange-400/25 dark:bg-orange-500/[0.08]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1 dark:border-orange-400/35 dark:bg-orange-500/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
              {earlyChip}
            </span>
          </div>
          <p className="text-sm italic leading-relaxed text-muted dark:text-white/65">{earlyIntro}</p>
          <ul className="mt-4 space-y-3">
            {earlyInsights.slice(0, 2).map((line, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-app dark:text-white/90">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/25 dark:bg-green-500/15">
                  <CheckIcon />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state === "full" ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <ExpandableInsightColumn title={leftColumnTitle} items={positives} variant="green" />
          <ExpandableInsightColumn title={rightColumnTitle} items={cautions} variant="orange" />
        </div>
      ) : null}
    </section>
  );
}
