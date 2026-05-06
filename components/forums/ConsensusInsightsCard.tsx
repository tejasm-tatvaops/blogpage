"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type ConsensusPayload = {
  consensusLevel: number;
  consensusLabel: string;
  agreements: string[];
  debate: {
    question: string;
    sideA: { title: string; points: string[] };
    sideB: { title: string; points: string[] };
  };
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  analyzedComments: number;
  analyzedInteractions: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function SkeletonLine({ w }: { w: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded bg-black/5 dark:bg-white/10`} />;
}

export function ConsensusInsightsCard({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsensusPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

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
      { rootMargin: "160px 0px 160px 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const storageKey = useMemo(() => `forum-consensus:${slug}`, [slug]);

  const fetchConsensus = async (force = false) => {
    if (loading) return;
    setLoadError(false);
    setLoading(true);
    try {
      const url = force
        ? `/api/forums/${encodeURIComponent(slug)}/consensus?force=1`
        : `/api/forums/${encodeURIComponent(slug)}/consensus`;
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        setLoadError(true);
        return;
      }
      const payload = (await response.json()) as ConsensusPayload;
      if (!payload || !Array.isArray(payload.agreements) || !payload.debate?.question) {
        setLoadError(true);
        return;
      }
      setData(payload);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), payload }));
      } catch {
        // ignore cache failures
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; payload: ConsensusPayload };
        if (parsed?.payload && Date.now() - parsed.at < CACHE_TTL_MS) {
          setData(parsed.payload);
          return;
        }
      }
    } catch {
      // ignore
    }

    void fetchConsensus(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, storageKey, slug]);

  if (!visible) return <div ref={rootRef} className="min-h-1" />;
  if (!loading && (!data || data.agreements.length === 0) && loadError) return null;
  if (!loading && (!data || data.agreements.length === 0)) return null;

  const consensusLevel = clamp(Math.round(data?.consensusLevel ?? 0), 0, 100);
  const consensusLabel = String(data?.consensusLabel ?? "").trim();

  return (
    <motion.section
      ref={rootRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="mb-4 rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-500/5 to-transparent p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-white/65">
            <span aria-hidden>✨</span>
            Discussion Intelligence
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-white/55">
            AI-analyzed patterns from builder discussion
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchConsensus(true)}
          className="rounded-full border border-app bg-surface px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-orange-400/60 hover:text-orange-700"
        >
          Refresh
        </button>
      </div>

      {/* Consensus Meter */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] tracking-wide text-slate-500 dark:text-white/55">
          <span className="truncate">{consensusLabel || "Consensus"}</span>
          <span className="shrink-0">{consensusLevel}% agreement</span>
        </div>
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-orange-500/70"
            initial={{ width: 0 }}
            animate={{ width: `${consensusLevel}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Key Consensus */}
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-white/65">
          Key Consensus
        </h3>
        <ul className="mt-2 space-y-2">
          {(data?.agreements ?? []).slice(0, 4).map((item, idx) => (
            <li key={`${idx}-${item}`} className="text-sm leading-6 text-slate-700 dark:text-white/80">
              • {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Debate */}
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-white/65">
          Main Debate
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-800 dark:text-white/85">
          {data?.debate?.question}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-app bg-surface p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-white/65">
              {data?.debate?.sideA?.title}
            </div>
            <ul className="mt-2 space-y-2">
              {(data?.debate?.sideA?.points ?? []).slice(0, 4).map((p, idx) => (
                <li key={`a-${idx}-${p}`} className="text-sm leading-6 text-slate-700 dark:text-white/80">
                  • {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-app bg-surface p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-white/65">
              {data?.debate?.sideB?.title}
            </div>
            <ul className="mt-2 space-y-2">
              {(data?.debate?.sideB?.points ?? []).slice(0, 4).map((p, idx) => (
                <li key={`b-${idx}-${p}`} className="text-sm leading-6 text-slate-700 dark:text-white/80">
                  • {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Strongest Recommendations */}
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-white/65">
          Strongest Recommendations
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(data?.recommendations ?? []).slice(0, 6).map((rec) => (
            <span
              key={rec}
              className="inline-flex items-center rounded-full border border-app bg-surface px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-orange-400/60 hover:text-orange-700"
              title={rec}
            >
              {rec}
            </span>
          ))}
        </div>
      </div>

      {/* Confidence row */}
      <div className="text-[11px] tracking-wide text-slate-500 dark:text-white/55">
        Confidence: {data?.confidence} • Based on {data?.analyzedComments} comments and {data?.analyzedInteractions} interactions
      </div>

      {/* Loading skeleton (kept extremely light) */}
      {loading && !data ? (
        <div className="mt-4 space-y-2">
          <SkeletonLine w="w-48" />
          <SkeletonLine w="w-72" />
          <SkeletonLine w="w-56" />
        </div>
      ) : null}
    </motion.section>
  );
}
