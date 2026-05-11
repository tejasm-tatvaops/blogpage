"use client";

import Link from "next/link";
import type { SiteJournalProject } from "@/data/siteJournals";

export function ProjectJournalCard({ project }: { project: SiteJournalProject }) {
  const contextualCover =
    project.timelineEntries
      .flatMap((entry) => entry.media)
      .find((asset) => asset.type === "image")
      ?.url ?? project.mediaCover;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group overflow-hidden rounded-2xl bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.045)] ring-1 ring-app/70 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface hover:shadow-[0_16px_40px_rgba(15,23,42,0.075)]"
    >
      <div className="relative h-40 w-full overflow-hidden bg-subtle sm:h-44">
        <img
          src={contextualCover}
          alt={project.title}
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute bottom-3 right-3 flex items-center justify-end gap-2">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white shadow-sm ring-1 ring-white/20">
            Week {project.timeline.week}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-[20px] font-semibold leading-tight text-app sm:text-[22px]">{project.title}</h3>
          <p className="mt-1 text-xs text-muted/80">
            {project.projectType} • {project.city}, {project.region}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-app/75">
          <div className="rounded-xl bg-surface p-2.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
            <p className="text-[10px] uppercase tracking-wide text-muted">Budget</p>
            <p className="mt-1">{project.budgetRange}</p>
          </div>
          <div className="rounded-xl bg-surface p-2.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
            <p className="text-[10px] uppercase tracking-wide text-muted">Lead</p>
            <p className="mt-1">{project.leadContributor.name}</p>
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted/80">
            <span>{project.timeline.stage}</span>
            <span>{project.timeline.progressPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200/80">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-amber-300"
              style={{ width: `${project.timeline.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="space-y-1 rounded-xl bg-subtle p-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">AI Site Summary</p>
          <p className="text-sm leading-6 text-muted">{project.aiRiskPulse}</p>
        </div>
        <div className="rounded-xl bg-subtle/65 p-3 text-xs text-app/80 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)]">
          <p className="line-clamp-2">{project.updatePreview}</p>
          <p className="mt-2 text-[11px] text-muted/80">{project.activeDiscussionCount} active discussions</p>
        </div>
      </div>
    </Link>
  );
}
