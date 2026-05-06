"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ForumAiSummaryCardProps = {
  slug: string;
};

type SummaryResponse = {
  summary?: string;
  bullets?: string[];
  confidence?: "high" | "medium" | "low";
};

const CACHE_TTL_MS = 15 * 60 * 1000;

function parseBullets(summary: string): string[] {
  return summary
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function ForumAiSummaryCard({ slug }: ForumAiSummaryCardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [bullets, setBullets] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px 120px 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const storageKey = useMemo(() => `forum-ai-summary:${slug}`, [slug]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { summary: string; bullets: string[]; confidence?: "high" | "medium" | "low"; at: number };
        if (Date.now() - parsed.at < CACHE_TTL_MS) {
          setSummary(parsed.summary);
          setBullets(parsed.bullets);
          setConfidence(parsed.confidence ?? null);
          return;
        }
      }
    } catch {
      // Ignore malformed cache payloads.
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/forums/${encodeURIComponent(slug)}/summary`, { method: "GET" });
        if (!response.ok) return;
        const payload = (await response.json()) as SummaryResponse;
        const incomingSummary = String(payload.summary ?? "").trim();
        const incomingBullets = Array.isArray(payload.bullets)
          ? payload.bullets.map((line) => String(line).trim()).filter(Boolean).slice(0, 4)
          : parseBullets(incomingSummary);
        if (!incomingSummary || incomingBullets.length === 0 || cancelled) return;
        setSummary(incomingSummary);
        setBullets(incomingBullets);
        setConfidence(payload.confidence ?? null);
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              summary: incomingSummary,
              bullets: incomingBullets,
              confidence: payload.confidence ?? null,
              at: Date.now(),
            }),
          );
        } catch {
          // Ignore storage quota issues.
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, storageKey, visible]);

  if (!visible) return <div ref={rootRef} className="min-h-1" />;
  if (!loading && (!summary || bullets.length === 0)) return null;

  return (
    <section
      ref={rootRef}
      className="mb-4 rounded-xl border border-orange-300/25 bg-gradient-to-br from-orange-500/5 to-transparent p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-white/65">
          <span aria-hidden>✨</span>
          AI Summary
        </div>
        {confidence ? (
          <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
            Confidence {confidence}
          </span>
        ) : null}
      </div>

      {loading && !summary ? (
        <p className="text-xs text-slate-500 dark:text-white/55">Building summary from the discussion…</p>
      ) : (
        <ul className="space-y-2">
          {bullets.map((point, index) => (
            <li key={`${index}-${point}`} className="max-w-none text-sm leading-6 text-slate-700 dark:text-white/80">
              • {point}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
