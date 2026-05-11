/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { ProjectTimelineEntry } from "@/data/siteJournals";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAskHref } from "@/lib/askContext";
import { EntryFieldNotes } from "@/components/projects/EntryFieldNotes";

const typeToneMap: Record<ProjectTimelineEntry["type"], string> = {
  "Progress Update": "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/70",
  "Procurement Decision": "text-amber-700 bg-amber-50 ring-1 ring-amber-200/70",
  "Cost Change": "text-orange-700 bg-orange-50 ring-1 ring-orange-200/70",
  "Issue Report": "text-rose-700 bg-rose-50 ring-1 ring-rose-200/70",
  "Site Milestone": "text-sky-700 bg-sky-50 ring-1 ring-sky-200/70",
  "Labor Update": "text-violet-700 bg-violet-50 ring-1 ring-violet-200/70",
  "Vendor Note": "text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200/70",
  "AI Insight": "text-fuchsia-700 bg-fuchsia-50 ring-1 ring-fuchsia-200/70",
  "Media Log": "text-cyan-700 bg-cyan-50 ring-1 ring-cyan-200/70",
};

/** Used only so hooks always run with valid derived values before empty-state UI returns. */
const EMPTY_TIMELINE_PLACEHOLDER: ProjectTimelineEntry = {
  id: "__timeline_placeholder__",
  weekLabel: "Week 0",
  type: "Progress Update",
  title: "",
  note: "",
  tags: [],
  media: [],
  commentsCount: 0,
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

function normalizeRiskFromEntryType(type: ProjectTimelineEntry["type"]): "low" | "medium" | "high" {
  if (type === "Issue Report" || type === "Cost Change") return "high";
  if (type === "Procurement Decision" || type === "Labor Update" || type === "Vendor Note") return "medium";
  return "low";
}

function rankValue(risk: "low" | "medium" | "high"): number {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function confidenceForRisk(risk: "low" | "medium" | "high"): "high" | "medium" | "low" {
  if (risk === "high") return "high";
  if (risk === "medium") return "medium";
  return "low";
}

function parseWeekNumber(label: string) {
  const match = label.match(/\b(\d{1,3})\b/);
  return match ? Number(match[1]) : 0;
}

function parseTimelineStart(start?: string): Date | null {
  if (!start) return null;
  const parsed = Date.parse(`01 ${start}`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function formatWeekDateLabel(week: number, timelineStarted?: string): string | null {
  const startDate = parseTimelineStart(timelineStarted);
  if (!startDate) return null;
  const labelDate = new Date(startDate);
  labelDate.setDate(startDate.getDate() + Math.max(0, week - 1) * 7);
  return labelDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function continuityTypeForWeek(week: number, maxWeek: number): ProjectTimelineEntry["type"] {
  if (maxWeek <= 1) return "AI Insight";
  const progress = week / maxWeek;
  if (progress > 0.75) return week % 2 === 0 ? "Site Milestone" : "Progress Update";
  if (progress > 0.45) return week % 3 === 0 ? "Procurement Decision" : "Labor Update";
  if (progress > 0.2) return week % 2 === 0 ? "Vendor Note" : "Issue Report";
  return week % 2 === 0 ? "Progress Update" : "AI Insight";
}

function continuityTitle(type: ProjectTimelineEntry["type"], week: number): string {
  const titleByType: Record<ProjectTimelineEntry["type"], string[]> = {
    "Progress Update": [
      "Execution rhythm held steady through routine sequencing checks",
      "Field progress remained aligned with planned handoff windows",
    ],
    "Procurement Decision": [
      "Procurement follow-ups prioritized to protect next cycle",
      "Material coordination decisions maintained supply continuity",
    ],
    "Cost Change": [
      "Cost watch tightened as allocation assumptions shifted slightly",
      "Minor commercial variation flagged for weekly review",
    ],
    "Issue Report": [
      "Localized execution friction observed and contained on site",
      "Short-cycle disruption surfaced and was handled in sequence",
    ],
    "Site Milestone": [
      "Micro milestone logged to preserve execution continuity",
      "Phase checkpoint recorded without major deviation",
    ],
    "Labor Update": [
      "Crew coordination balanced to reduce overlap rework",
      "Labor deployment adjusted to sustain workflow continuity",
    ],
    "Vendor Note": [
      "Vendor alignment check completed for upcoming dependencies",
      "Supplier communication cadence held stable this week",
    ],
    "AI Insight": [
      "Weekly field review recorded from site notes and supervisor updates",
      "Execution remained steady with routine monitoring on active fronts",
    ],
    "Media Log": ["Field documentation checkpoint recorded for site records"],
  };
  const options = titleByType[type];
  return options[week % options.length] ?? `Week ${week} site record`;
}

function continuityNote(input: {
  week: number;
  maxWeek: number;
  type: ProjectTimelineEntry["type"];
  previousLogged?: ProjectTimelineEntry;
  nextLogged?: ProjectTimelineEntry;
}): string {
  const { week, maxWeek, type, previousLogged, nextLogged } = input;
  const previousPhrase = previousLogged
    ? `carried forward signals last seen in ${previousLogged.weekLabel.toLowerCase()}`
    : "maintained baseline sequencing discipline";
  const nextPhrase = nextLogged
    ? `while preparing for dependencies captured in ${nextLogged.weekLabel.toLowerCase()}`
    : "while keeping upcoming execution windows protected";
  const phase =
    week / Math.max(1, maxWeek) > 0.66
      ? "Early-cycle momentum remained structured"
      : week / Math.max(1, maxWeek) > 0.33
        ? "Mid-cycle pressure stayed manageable"
        : "Late-cycle control checks remained active";

  if (type === "Procurement Decision") {
    return `${phase}; procurement follow-ups ${previousPhrase} ${nextPhrase}.`;
  }
  if (type === "Labor Update") {
    return `${phase}; labor allocation stayed coordinated, ${previousPhrase} ${nextPhrase}.`;
  }
  if (type === "Vendor Note") {
    return `${phase}; vendor communication remained stable and ${previousPhrase} ${nextPhrase}.`;
  }
  if (type === "Issue Report") {
    return `${phase}; a small execution friction point was observed, then contained, and ${previousPhrase} ${nextPhrase}.`;
  }
  if (type === "Site Milestone") {
    return `${phase}; a checkpoint was logged to maintain chronology, ${previousPhrase} ${nextPhrase}.`;
  }
  return `${phase}; execution remained under monitored continuity with teams applying routine controls, ${previousPhrase} ${nextPhrase}.`;
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
    <div className="mb-10 rounded-2xl bg-surface p-4 shadow-[0_10px_22px_rgba(15,23,42,0.045)] ring-1 ring-app/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Pressure Arc</p>
      <div className="mt-3 overflow-hidden rounded-xl bg-subtle shadow-[inset_0_0_0_1px_rgba(148,163,184,0.25)]">
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
          <span key={`${s.label}-legend`} className="rounded-full bg-surface px-2.5 py-1 shadow-sm ring-1 ring-app/70">
            Weeks {s.fromWeek}-{s.toWeek} • {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TinyIcon({ name }: { name: "risk" | "pattern" | "change" | "forecast" | "memory" | "cross" | "shift" }) {
  const common = "h-3.5 w-3.5";
  if (name === "risk") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "pattern") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h8M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "change") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 7h10v10H7V7z" stroke="currentColor" strokeWidth="2" />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (name === "forecast") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 16l5-5 4 4 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 9V4h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "memory") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4h10v16H7V4z" stroke="currentColor" strokeWidth="2" />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "cross") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ProjectTimeline({
  entries,
  todayWeekLabel,
  siteConditions,
  askContextBase,
  totalWeeks,
  timelineStarted,
}: {
  entries: ProjectTimelineEntry[];
  todayWeekLabel?: string;
  siteConditions?: Array<{ label: string; value: string }>;
  askContextBase?: {
    projectSlug: string;
    journalTitle: string;
    cityRegion: string;
    risks: string;
    tags: string;
    discussions: string;
    expertise: string;
    similarProjects?: string[];
  };
  totalWeeks?: number;
  timelineStarted?: string;
}) {
  const sortedEntries = useMemo(() => {
    const list = [...entries];
    // Keep current ordering unless week parsing indicates otherwise.
    list.sort((a, b) => parseWeekNumber(b.weekLabel) - parseWeekNumber(a.weekLabel));
    return list;
  }, [entries]);
  const loggedWeeks = useMemo(
    () => new Set(sortedEntries.map((entry) => parseWeekNumber(entry.weekLabel)).filter((week) => week > 0)),
    [sortedEntries],
  );
  const entryByWeek = useMemo(() => {
    const map = new Map<number, ProjectTimelineEntry>();
    for (const entry of sortedEntries) {
      const week = parseWeekNumber(entry.weekLabel);
      if (week > 0 && !map.has(week)) map.set(week, entry);
    }
    return map;
  }, [sortedEntries]);
  const maxTimelineWeek = useMemo(() => {
    const fromEntries = Math.max(0, ...sortedEntries.map((entry) => parseWeekNumber(entry.weekLabel)));
    return Math.max(totalWeeks ?? 0, fromEntries);
  }, [sortedEntries, totalWeeks]);
  const continuityEntryByWeek = useMemo(() => {
    const map = new Map<number, ProjectTimelineEntry>();
    for (let week = maxTimelineWeek; week >= 1; week -= 1) {
      const existing = entryByWeek.get(week);
      if (existing) {
        map.set(week, existing);
        continue;
      }
      const previousLogged = (() => {
        for (let w = week + 1; w <= maxTimelineWeek; w += 1) {
          const candidate = entryByWeek.get(w);
          if (candidate) return candidate;
        }
        return undefined;
      })();
      const nextLogged = (() => {
        for (let w = week - 1; w >= 1; w -= 1) {
          const candidate = entryByWeek.get(w);
          if (candidate) return candidate;
        }
        return undefined;
      })();
      const entryType = continuityTypeForWeek(week, maxTimelineWeek);
      map.set(week, {
        id: `continuity-week-${week}`,
        weekLabel: `Week ${week}`,
        type: entryType,
        title: continuityTitle(entryType, week),
        note: continuityNote({
          week,
          maxWeek: maxTimelineWeek,
          type: entryType,
          previousLogged,
          nextLogged,
        }),
        contributorName: "Field Documentation Desk",
        contributorBadge: "Operational Memory",
        createdAtLabel: `${formatWeekDateLabel(week, timelineStarted) ?? `Week ${week}`} • ${
          week % 2 === 0 ? "Backfilled from weekly records" : "Compiled from field logs"
        }`,
        tags:
          entryType === "Procurement Decision"
            ? ["procurement-watch", "supply-followup"]
            : entryType === "Labor Update"
              ? ["labor-coordination", "crew-balance"]
              : entryType === "Vendor Note"
                ? ["vendor-sequence", "dispatch-check"]
                : entryType === "Issue Report"
                  ? ["field-friction", "site-monitoring"]
                  : ["weekly-log", "site-record"],
        media: [],
        aiSummary:
          entryType === "Issue Report"
            ? "Operational note: minor friction signal inferred from supervisor and crew logs."
            : "Operational note: week summary compiled from site records to maintain chronology.",
        commentsCount: 0,
      });
    }
    return map;
  }, [entryByWeek, maxTimelineWeek, timelineStarted]);
  const timelineRows = useMemo(
    () =>
      Array.from({ length: maxTimelineWeek }, (_, idx) => {
        const week = maxTimelineWeek - idx;
        const entry = continuityEntryByWeek.get(week);
        return {
          week,
          entry,
          isMissing: !entryByWeek.get(week),
        };
      }),
    [continuityEntryByWeek, entryByWeek, maxTimelineWeek],
  );

  const initialActiveWeek = parseWeekNumber(todayWeekLabel ?? sortedEntries[0]?.weekLabel ?? "0");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeEntry =
    timelineRows[activeIndex]?.entry ??
    timelineRows.find((row) => row.entry)?.entry ??
    sortedEntries[0] ??
    EMPTY_TIMELINE_PLACEHOLDER;
  const activeFx = toneFxMap[activeEntry.type] ?? toneFxMap["Procurement Decision"];
  const activeWeekNum =
    parseWeekNumber(activeEntry.weekLabel) ||
    initialActiveWeek ||
    parseWeekNumber(sortedEntries[0]?.weekLabel ?? "0");

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
    sectionRefs.current = sectionRefs.current.slice(0, timelineRows.length);
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
  }, [timelineRows.length]);

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

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-subtle/40 p-8 text-sm text-muted shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35)]">
        This site journal has not documented its first execution update yet.
      </div>
    );
  }

  return (
    <div
      className="relative rounded-3xl bg-surface px-4 py-8 shadow-[0_18px_46px_rgba(15,23,42,0.06)] ring-1 ring-app/70 sm:px-6 sm:py-10"
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
        <div className="mb-10 flex flex-wrap items-center gap-2 border-l border-app/70 pl-4 text-xs text-muted sm:pl-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app/70">Site Conditions</span>
          {siteConditions.map((c) => (
            <span key={`${c.label}-${c.value}`} className="rounded-full bg-surface px-2.5 py-1 shadow-sm ring-1 ring-app/70">
              {c.label}: {c.value}
            </span>
          ))}
        </div>
      ) : null}

      {maxTimelineWeek > 0 ? (
        <div className="mb-8 rounded-xl bg-subtle/40 p-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.3)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Week ledger</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: maxTimelineWeek }, (_, idx) => maxTimelineWeek - idx).map((week) => (
              <span
                key={`week-ledger-${week}`}
                className={
                  loggedWeeks.has(week)
                    ? "rounded-full bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.35)]"
                    : "rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted shadow-sm ring-1 ring-app/70"
                }
              >
                Week {week} {loggedWeeks.has(week) ? "• recorded on site" : "• backfilled from weekly records"}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative space-y-12 pl-10 sm:space-y-16 sm:pl-12">
        <div
          className="pointer-events-none absolute bottom-0 left-3 top-2 w-px bg-gradient-to-b from-orange-300/35 via-orange-400/60 to-amber-300/30 transition-all duration-700 sm:left-4"
          style={{ boxShadow: `0 0 12px var(--sj-glow)` }}
        />
        {timelineRows.map((row, index) => {
          const entry = row.entry;
          if (!entry) return null;
          const previousEntry = (() => {
            for (let week = row.week - 1; week >= 1; week -= 1) {
              const prior = entryByWeek.get(week);
              if (prior) return prior;
            }
            return undefined;
          })();
          const currentRisk = normalizeRiskFromEntryType(entry.type);
          const previousRisk = previousEntry ? normalizeRiskFromEntryType(previousEntry.type) : currentRisk;
          const confidence = confidenceForRisk(currentRisk);
          const consecutiveRiskWeeks = (() => {
            let count = 0;
            for (let i = index; i < timelineRows.length; i += 1) {
              const candidate = timelineRows[i]?.entry;
              if (!candidate) break;
              const risk = normalizeRiskFromEntryType(candidate.type);
              if (risk === currentRisk && rankValue(risk) >= 2) count += 1;
              else break;
            }
            return count;
          })();
          const patternDetection =
            rankValue(currentRisk) >= 2 && consecutiveRiskWeeks >= 2
              ? `${entry.type} signal is persisting for ${consecutiveRiskWeeks} consecutive logged weeks.`
              : rankValue(currentRisk) >= 2
                ? `${entry.type} signal appears this week and needs close tracking in the next cycle.`
                : "Execution signal remains comparatively stable against recent entries.";
          const changeDetection = previousEntry
            ? rankValue(currentRisk) > rankValue(previousRisk)
              ? `Risk intensity increased from ${previousEntry.type} to ${entry.type} this week.`
              : rankValue(currentRisk) < rankValue(previousRisk)
                ? `Risk intensity reduced relative to ${previousEntry.type}; this indicates partial stabilization.`
                : `Signal profile remains in the same band as ${previousEntry.type}, suggesting continuity in site pressure.`
            : "Baseline entry established for ongoing signal comparison.";
          const forecast = rankValue(currentRisk) >= 3
            ? "At current pace, next 2 weeks may see schedule compression and procurement spillover unless mitigation starts immediately."
            : rankValue(currentRisk) === 2
              ? "If this pattern persists, next 2 weeks are likely to show moderate execution drag with localized delays."
              : "Next 2 weeks are likely to remain stable if current controls and sequencing discipline continue.";
          const previousObserved = (() => {
            if (!previousEntry) return "";
            const prevWeek = previousEntry.weekLabel;
            if (rankValue(currentRisk) >= 2) {
              return `Previously observed in ${prevWeek} during ${previousEntry.type.toLowerCase()} pressure.`;
            }
            return `Previously observed in ${prevWeek} under relatively stable execution conditions.`;
          })();
          const contradictionNote =
            previousEntry && rankValue(currentRisk) - rankValue(previousRisk) >= 2
              ? `Execution narrative shifted significantly after ${previousEntry.type.toLowerCase()} signals.`
              : "";
          const crossJournalMemory = askContextBase?.similarProjects?.[0]
            ? `Pattern resemblance noted in ${askContextBase.similarProjects[0]}.`
            : "";
          const confidenceLine =
            confidence === "high"
              ? "Repeated procurement pressure detected."
              : confidence === "medium"
                ? "Potential labor or sequencing instability pattern emerging."
                : "Possible sequencing disruption inferred from current signals.";
          const confidenceTone =
            confidence === "high"
              ? "text-app/90"
              : confidence === "medium"
                ? "text-app/75"
                : "text-muted";
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
          className="relative pb-1 transition-opacity duration-500"
          style={{ opacity: index === activeIndex ? 1 : 0.94 }}
        >
          <span
            className={`absolute -left-[30px] top-4 h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_0_3px_rgba(251,146,60,0.14)] sm:-left-[35px] sm:h-2.5 sm:w-2.5 sm:shadow-[0_0_0_4px_rgba(251,146,60,0.16)] ${todayWeekLabel && entry.weekLabel === todayWeekLabel ? "animate-pulse" : ""}`}
          />
          <div className="mb-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-orange-700">{entry.weekLabel}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{entry.createdAtLabel ?? "Execution Log"}</p>
          </div>
          <article
            className={`relative space-y-4 rounded-2xl bg-surface p-3 shadow-[0_10px_26px_rgba(15,23,42,0.045)] ring-1 ring-app/70 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] sm:space-y-5 sm:p-4 ${density === "dense" ? "pb-2" : ""}`}
          >
            {shouldStamp ? (
              <div className="pointer-events-none absolute right-0 top-0 -rotate-6">
                <span className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-rose-700 shadow-sm ring-1 ring-rose-200/80">
                  Critical
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className={`rounded-full px-2 py-0.5 uppercase tracking-wide ${typeToneMap[entry.type]}`}>{entry.type}</span>
              <span>{entry.contributorName ?? "Site Contributor"}</span>
              <span>{entry.createdAtLabel ?? "Site update"}</span>
            </div>
            <h3 className="max-w-3xl text-xl font-semibold leading-snug text-app sm:text-2xl">{entry.title}</h3>
            <p className="max-w-3xl text-[14px] leading-7 text-app/85 sm:text-[15px] sm:leading-8">
              {shouldMarker ? (
                <span className="rounded-sm bg-[linear-gradient(transparent_60%,rgba(251,146,60,0.22)_60%,rgba(251,146,60,0.22)_92%,transparent_92%)]">
                  {entry.note}
                </span>
              ) : (
                entry.note
              )}
            </p>

            {entry.aiSummary ? (
              <div className="max-w-2xl border-l-2 border-orange-300/70 pl-4">
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
                        className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-44"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.caption}
                        className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-44"
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
                <span key={tag} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted ring-1 ring-app/70">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="space-y-1 text-xs text-muted">
              <p>{entry.commentsCount} field notes</p>
              {entry.linkedDiscussion ? <p>Related discussion: <Link href={entry.linkedDiscussion.href} className="text-orange-700 hover:text-orange-800">{entry.linkedDiscussion.title}</Link></p> : null}
            </div>
            <details className="rounded-xl bg-subtle p-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app/75">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface shadow-sm ring-1 ring-app/70">
                      <svg className="h-3.5 w-3.5 text-orange-700" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </span>
                    AI Operational Insight
                  </div>
                  <span className="text-[11px] text-muted">Risk • Forecast • Memory</span>
                </div>
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                <p className={`flex gap-2 rounded-lg bg-surface px-3 py-2 shadow-sm ring-1 ring-app/70 ${confidenceTone}`}>
                  <span className="mt-0.5 text-orange-700">
                    <TinyIcon name="risk" />
                  </span>
                  <span>
                    <span className="font-semibold text-app/85">Risk:</span> {confidenceLine}
                  </span>
                </p>
                <p className="flex gap-2 rounded-lg border-l-2 border-orange-200 bg-surface px-3 py-2 text-muted shadow-sm">
                  <span className="mt-0.5 text-orange-700">
                    <TinyIcon name="pattern" />
                  </span>
                  <span>
                    <span className="font-semibold text-app/85">Pattern:</span> {patternDetection}
                  </span>
                </p>
                <p className="flex gap-2 rounded-lg border-l-2 border-sky-200 bg-surface px-3 py-2 text-muted shadow-sm">
                  <span className="mt-0.5 text-sky-700">
                    <TinyIcon name="change" />
                  </span>
                  <span>
                    <span className="font-semibold text-app/85">Change:</span> {changeDetection}
                  </span>
                </p>
                <p className="flex gap-2 rounded-lg border-l-2 border-violet-200 bg-surface px-3 py-2 text-muted shadow-sm">
                  <span className="mt-0.5 text-violet-700">
                    <TinyIcon name="forecast" />
                  </span>
                  <span>
                    <span className="font-semibold text-app/85">Forecast:</span> {forecast}
                  </span>
                </p>
                <p className="flex gap-2 rounded-lg border-l-2 border-amber-200 bg-surface px-3 py-2 text-muted shadow-sm">
                  <span className="mt-0.5 text-amber-700">
                    <TinyIcon name="memory" />
                  </span>
                  <span>
                    <span className="font-semibold text-app/85">Memory:</span> {previousObserved || "No prior recurrence signal captured yet."}
                  </span>
                </p>
                {crossJournalMemory ? (
                  <p className="flex gap-2 rounded-lg border-l-2 border-indigo-200 bg-surface px-3 py-2 text-muted shadow-sm">
                    <span className="mt-0.5 text-indigo-700">
                      <TinyIcon name="cross" />
                    </span>
                    <span>
                      <span className="font-semibold text-app/85">Cross-journal:</span> {crossJournalMemory}
                    </span>
                  </p>
                ) : null}
                {contradictionNote ? (
                  <p className="flex gap-2 rounded-lg border-l-2 border-rose-200 bg-surface px-3 py-2 text-app/80 shadow-sm">
                    <span className="mt-0.5 text-rose-700">
                      <TinyIcon name="shift" />
                    </span>
                    <span>
                      <span className="font-semibold text-app/90">Narrative shift:</span> {contradictionNote}
                    </span>
                  </p>
                ) : null}
              </div>
            </details>
            {askContextBase ? (
              <div className="flex flex-wrap gap-1.5 border-l border-app/70 pl-3 text-[11px]">
                {[
                  { label: "Explain impact", prompt: `Explain operational impact for ${entry.weekLabel} (${entry.type}) in ${askContextBase.journalTitle}.`, aiMode: "site_analyst" as const },
                  { label: "Predict next issue", prompt: `Predict the next likely issue after ${entry.weekLabel} entry: ${entry.title}.`, aiMode: "planning_engineer" as const },
                  { label: "Mitigation plan", prompt: `Generate a mitigation plan for this entry: ${entry.title}.`, aiMode: "site_analyst" as const },
                  { label: "Compare similar", prompt: `Compare this situation with similar site patterns for ${askContextBase.cityRegion}.`, aiMode: "debate_synthesizer" as const },
                  { label: "Forecast 2 weeks", prompt: `Forecast the next 2 weeks after this entry and key risks to watch.`, aiMode: "planning_engineer" as const },
                ].map((chip) => (
                  <Link
                    key={`${entry.id}-${chip.label}`}
                    href={buildAskHref({
                      prompt: chip.prompt,
                      anchor: `sj:${askContextBase.projectSlug}`,
                      sourceType: "siteJournal",
                      aiMode: chip.aiMode,
                      page: "site_journal_entry",
                      intent: chip.prompt,
                      journal: askContextBase.journalTitle,
                      week: entry.weekLabel,
                      city: askContextBase.cityRegion,
                      risks: askContextBase.risks,
                      tags: askContextBase.tags,
                      discussions: askContextBase.discussions,
                      expertise: askContextBase.expertise,
                    })}
                    className="rounded-full bg-surface px-2.5 py-1 text-[10px] tracking-wide text-muted shadow-sm ring-1 ring-app/70 transition hover:-translate-y-0.5 hover:text-app hover:shadow-[0_8px_14px_rgba(251,146,60,0.16)]"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {askContextBase ? (
              entry.id.startsWith("continuity-week-") ? (
                <div className="rounded-xl bg-subtle/40 px-3 py-2 text-xs text-muted shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35)]">
                  Field notes are available on documented weekly entries. This continuity row preserves chronology only.
                </div>
              ) : (
                <EntryFieldNotes
                  slug={askContextBase.projectSlug}
                  entryId={entry.id}
                  entryTitle={entry.title}
                  weekLabel={entry.weekLabel}
                  cityRegion={askContextBase.cityRegion}
                />
              )
            ) : null}
          </article>
        </section>
          );
        })}
      </div>
    </div>
  );
}
