/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { ProjectTimelineEntry } from "@/data/siteJournals";
import { useEffect, useMemo, useRef, useState } from "react";

const typeToneMap: Record<ProjectTimelineEntry["type"], string> = {
  "Progress Update": "text-emerald-700 border-emerald-200 bg-emerald-50",
  "Procurement Decision": "text-amber-700 border-amber-200 bg-amber-50",
  "Cost Change": "text-orange-700 border-orange-200 bg-orange-50",
  "Issue Report": "text-rose-700 border-rose-200 bg-rose-50",
  "Site Milestone": "text-sky-700 border-sky-200 bg-sky-50",
  "Labor Update": "text-violet-700 border-violet-200 bg-violet-50",
  "Vendor Note": "text-indigo-700 border-indigo-200 bg-indigo-50",
  "AI Insight": "text-fuchsia-700 border-fuchsia-200 bg-fuchsia-50",
  "Media Log": "text-cyan-700 border-cyan-200 bg-cyan-50",
};

const toneFxMap: Record<ProjectTimelineEntry["type"], { tint: string; glow: string }> = {
  "Progress Update": { tint: "rgba(16,185,129,0.06)", glow: "rgba(16,185,129,0.55)" },
  "Procurement Decision": { tint: "rgba(245,158,11,0.07)", glow: "rgba(245,158,11,0.62)" },
  "Cost Change": { tint: "rgba(249,115,22,0.07)", glow: "rgba(249,115,22,0.58)" },
  "Issue Report": { tint: "rgba(244,63,94,0.06)", glow: "rgba(244,63,94,0.6)" },
  "Site Milestone": { tint: "rgba(56,189,248,0.06)", glow: "rgba(56,189,248,0.6)" },
  "Labor Update": { tint: "rgba(139,92,246,0.06)", glow: "rgba(139,92,246,0.6)" },
  "Vendor Note": { tint: "rgba(99,102,241,0.06)", glow: "rgba(99,102,241,0.6)" },
  "AI Insight": { tint: "rgba(217,70,239,0.05)", glow: "rgba(217,70,239,0.55)" },
  "Media Log": { tint: "rgba(34,211,238,0.05)", glow: "rgba(34,211,238,0.55)" },
};

function parseWeekNumber(label: string) {
  const match = label.match(/\b(\d{1,3})\b/);
  return match ? Number(match[1]) : 0;
}

function PressureArc({
  segments,
  activeWeek,
}: {
  segments: Array<{ label: string; tone: "stable" | "pressure" | "risk" | "recovery"; fromWeek: number; toWeek: number }>;
  activeWeek: number;
}) {
  const toneClass: Record<string, string> = {
    stable: "from-emerald-400/35 to-emerald-400/5",
    pressure: "from-amber-400/45 to-amber-400/5",
    risk: "from-rose-400/45 to-rose-400/5",
    recovery: "from-sky-400/40 to-sky-400/5",
  };
  const total = Math.max(1, segments.reduce((acc, s) => acc + Math.max(1, s.toWeek - s.fromWeek + 1), 0));

  return (
    <div className="mb-10 rounded-2xl border border-app bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Pressure Arc</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-app bg-subtle">
        <div className="flex h-9">
          {segments.map((s) => {
            const w = Math.max(1, s.toWeek - s.fromWeek + 1);
            const isActive = activeWeek >= s.fromWeek && activeWeek <= s.toWeek;
            return (
              <div
                key={`${s.label}-${s.fromWeek}-${s.toWeek}`}
                style={{ width: `${(w / total) * 100}%` }}
                className={`relative h-full bg-gradient-to-r ${toneClass[s.tone]} ${isActive ? "opacity-100" : "opacity-70"} transition-opacity`}
                title={`${s.label} (Weeks ${s.fromWeek}-${s.toWeek})`}
              >
                <div className="absolute inset-y-0 left-0 w-px bg-black/10" />
                <div className={`absolute inset-0 ${isActive ? "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.16)]" : ""}`} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        {segments.map((s) => (
          <span key={`${s.label}-legend`} className="rounded-full border border-app bg-surface px-2.5 py-1">
            Weeks {s.fromWeek}-{s.toWeek} • {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProjectTimeline({
  entries,
  todayWeekLabel,
  siteConditions,
}: {
  entries: ProjectTimelineEntry[];
  todayWeekLabel?: string;
  siteConditions?: Array<{ label: string; value: string }>;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app/70 bg-subtle/40 p-8 text-sm text-muted">
        This site journal has not documented its first execution update yet.
      </div>
    );
  }

  const sortedEntries = useMemo(() => {
    const list = [...entries];
    // Keep current ordering unless week parsing indicates otherwise.
    list.sort((a, b) => parseWeekNumber(b.weekLabel) - parseWeekNumber(a.weekLabel));
    return list;
  }, [entries]);

  const initialActiveWeek = parseWeekNumber(todayWeekLabel ?? sortedEntries[0]?.weekLabel ?? "0");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeEntry = sortedEntries[activeIndex] ?? sortedEntries[0];
  const activeFx = toneFxMap[activeEntry.type] ?? toneFxMap["Procurement Decision"];
  const activeWeekNum = parseWeekNumber(activeEntry.weekLabel) || initialActiveWeek || parseWeekNumber(sortedEntries[0].weekLabel);

  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const mediaRefs = useRef<Array<HTMLDivElement | null>>([]);

  const pressureSegments = useMemo(() => {
    const weeks = sortedEntries.map((e) => parseWeekNumber(e.weekLabel)).filter(Boolean);
    const maxW = Math.max(1, ...weeks, activeWeekNum || 1);
    const minW = Math.max(1, Math.min(...weeks, activeWeekNum || 1));
    const span = Math.max(1, maxW - minW + 1);
    const a = minW;
    const b = Math.min(maxW, minW + Math.floor(span * 0.35));
    const c = Math.min(maxW, minW + Math.floor(span * 0.65));
    const d = maxW;
    const currentTone = activeEntry.type === "Issue Report" ? "risk" : activeEntry.type === "Procurement Decision" ? "pressure" : "stable";
    return [
      { label: "Stable", tone: "stable" as const, fromWeek: a, toWeek: Math.max(a, b) },
      { label: "Procurement Pressure", tone: "pressure" as const, fromWeek: Math.min(maxW, b + 1), toWeek: Math.max(Math.min(maxW, b + 1), c) },
      { label: "Delay Risk", tone: "risk" as const, fromWeek: Math.min(maxW, c + 1), toWeek: Math.max(Math.min(maxW, c + 1), Math.min(maxW, d - 1)) },
      { label: currentTone === "stable" ? "Recovery Phase" : "Current Phase", tone: "recovery" as const, fromWeek: Math.max(minW, d), toWeek: Math.max(minW, d) },
    ].filter((s) => s.fromWeek <= s.toWeek);
  }, [activeEntry.type, activeWeekNum, sortedEntries]);

  useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, sortedEntries.length);
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entriesObs) => {
        const visible = entriesObs
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!visible) return;
        const idx = Number((visible.target as HTMLElement).dataset.index ?? "0");
        if (!Number.isNaN(idx)) setActiveIndex(idx);
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: [0.12, 0.22, 0.35, 0.5] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sortedEntries.length]);

  useEffect(() => {
    // Subtle parallax only for media blocks that exist.
    const onScroll = () => {
      for (const el of mediaRefs.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const center = r.top + r.height / 2;
        const offset = (center - window.innerHeight / 2) / (window.innerHeight / 2);
        const dy = Math.max(-8, Math.min(8, offset * -6));
        el.style.setProperty("--sj-parallax", `${dy}px`);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="relative rounded-3xl border border-app bg-surface px-6 py-10"
      style={
        {
          "--sj-tint": activeFx.tint,
          "--sj-glow": activeFx.glow,
        } as React.CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_40%_20%,var(--sj-tint),transparent_55%)] opacity-100 transition-opacity duration-700" />

      <PressureArc segments={pressureSegments} activeWeek={activeWeekNum} />

      {siteConditions?.length ? (
        <div className="mb-10 flex flex-wrap items-center gap-2 border-l border-app/60 pl-6 text-xs text-muted">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app/70">Site Conditions</span>
          {siteConditions.map((c) => (
            <span key={`${c.label}-${c.value}`} className="rounded-full border border-app bg-surface px-2.5 py-1">
              {c.label}: {c.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative space-y-16 pl-12">
        <div
          className="pointer-events-none absolute bottom-0 left-4 top-2 w-px bg-gradient-to-b from-orange-300/70 via-orange-400 to-amber-300/60 transition-all duration-700"
          style={{ boxShadow: `0 0 18px var(--sj-glow)` }}
        />
        {sortedEntries.map((entry, index) => {
          const density = entry.media.length >= 2 || entry.commentsCount >= 12 ? "dense" : entry.media.length ? "image" : "calm";
          const shouldStamp = entry.type === "Issue Report" || entry.type === "Cost Change";
          const shouldMarker = entry.type === "Procurement Decision" || entry.type === "Issue Report";
          return (
        <section
          key={entry.id}
          ref={(el) => {
            sectionRefs.current[index] = el;
          }}
          data-index={index}
          className="relative pb-2 transition-opacity duration-500"
          style={{ opacity: index === activeIndex ? 1 : 0.94 }}
        >
          <span
            className={`absolute -left-[35px] top-4 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_0_4px_rgba(251,146,60,0.16)] ${todayWeekLabel && entry.weekLabel === todayWeekLabel ? "animate-pulse" : ""}`}
          />
          <div className="mb-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-orange-700">{entry.weekLabel}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{entry.createdAtLabel ?? "Execution Log"}</p>
          </div>
          <article className={`relative space-y-5 ${density === "dense" ? "pb-2" : ""}`}>
            {shouldStamp ? (
              <div className="pointer-events-none absolute right-0 top-0 -rotate-6">
                <span className="inline-flex rounded-md border border-rose-300/50 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-700 shadow-sm">
                  Critical
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className={`rounded-full border px-2 py-0.5 uppercase tracking-wide ${typeToneMap[entry.type]}`}>{entry.type}</span>
              <span>{entry.contributorName ?? "Site Contributor"}</span>
              <span>{entry.createdAtLabel ?? "Site update"}</span>
            </div>
            <h3 className="max-w-3xl text-2xl font-semibold leading-tight text-app">{entry.title}</h3>
            <p className="max-w-3xl text-[15px] leading-8 text-app/85">
              {shouldMarker ? (
                <span className="rounded-sm bg-[linear-gradient(transparent_60%,rgba(251,146,60,0.22)_60%,rgba(251,146,60,0.22)_92%,transparent_92%)]">
                  {entry.note}
                </span>
              ) : (
                entry.note
              )}
            </p>

            {entry.aiSummary ? (
              <div className="max-w-2xl border-l border-orange-300/80 pl-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">Operational Note</p>
                <p className="mt-1 text-sm leading-7 text-muted">{entry.aiSummary}</p>
              </div>
            ) : null}

            {entry.media.length ? (
              <div
                ref={(el) => {
                  mediaRefs.current[index] = el;
                }}
                className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${density === "image" ? "sm:gap-4" : ""}`}
                style={{ transform: "translateY(var(--sj-parallax, 0px))", transition: "transform 700ms ease" }}
              >
                {entry.media.map((asset, idx) => (
                  <div key={`${entry.id}-${asset.url}`} className="group relative overflow-hidden rounded-xl bg-black/95">
                    {asset.type === "video" ? (
                      <video
                        src={asset.url}
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.caption}
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/28 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:3px_3px]" />
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-5 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                        {entry.media.length > 1 ? (idx === 0 ? "Before" : "After") : "Captured on site"}
                      </p>
                      <p className="mt-1 text-[11px] font-medium">
                        {entry.weekLabel} • {entry.type}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/85 line-clamp-2">{asset.caption}</p>
                      {entry.aiSummary ? (
                        <p className="mt-0.5 text-[10px] text-orange-200/90 line-clamp-1">AI context: {entry.aiSummary}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-white/60">Captured on site • {entry.weekLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="space-y-1 text-xs text-muted">
              <p>{entry.commentsCount} discussion notes</p>
              {entry.linkedDiscussion ? <p>Related discussion: <Link href={entry.linkedDiscussion.href} className="text-orange-700 hover:text-orange-800">{entry.linkedDiscussion.title}</Link></p> : null}
            </div>
          </article>
        </section>
          );
        })}
      </div>
    </div>
  );
}
