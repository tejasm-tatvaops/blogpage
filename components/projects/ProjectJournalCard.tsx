"use client";

import Link from "next/link";
import type { SiteJournalProject } from "@/data/siteJournals";
import { cn } from "@/lib/cn";

const healthMap: Record<SiteJournalProject["health"], { label: string; className: string }> = {
  stable: { label: "Stable", className: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  watch: { label: "Watch Procurement", className: "text-amber-700 border-amber-200 bg-amber-50" },
  risk: { label: "Delay Risk", className: "text-rose-700 border-rose-200 bg-rose-50" },
};

export function ProjectJournalCard({ project }: { project: SiteJournalProject }) {
  const health = healthMap[project.health];
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group overflow-hidden rounded-2xl border border-app bg-surface transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-44 w-full overflow-hidden bg-subtle">
        <img
          src={project.mediaCover}
          alt={project.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", health.className)}>
            {health.label}
          </span>
          <span className="rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-[10px] text-white">
            Week {project.timeline.week}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-xl font-semibold leading-tight text-app">{project.title}</h3>
          <p className="mt-1 text-xs text-muted/80">
            {project.projectType} - {project.city}, {project.region}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-app/75">
          <div className="rounded-xl border border-app bg-white p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">Budget</p>
            <p className="mt-1">{project.budgetRange}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">Lead</p>
            <p className="mt-1">{project.leadContributor.name}</p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted/80">
            <span>{project.timeline.stage}</span>
            <span>{project.timeline.progressPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-amber-300"
              style={{ width: `${project.timeline.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">AI Site Summary</p>
          <p className="text-sm leading-6 text-muted">{project.aiRiskPulse}</p>
        </div>
        <div className="rounded-xl border border-app bg-subtle p-3 text-xs text-app/80">
          <p className="line-clamp-2">{project.updatePreview}</p>
          <p className="mt-2 text-[11px] text-muted/80">{project.activeDiscussionCount} active discussions</p>
        </div>
      </div>
    </Link>
  );
}
