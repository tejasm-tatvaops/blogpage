import Link from "next/link";
import type { ProjectTimelineEntry } from "@/data/siteJournals";

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

export function ProjectTimeline({
  entries,
  todayWeekLabel,
}: {
  entries: ProjectTimelineEntry[];
  todayWeekLabel?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-app/60 bg-surface p-5 text-sm text-muted">
        This site journal has not documented its first execution update yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-8 pl-8">
      <div className="pointer-events-none absolute bottom-0 left-3 top-1 w-[2px] rounded-full bg-gradient-to-b from-orange-300 via-orange-400 to-amber-300 shadow-[0_0_10px_rgba(251,146,60,0.45)]" />
      {entries.map((entry) => (
        <section key={entry.id} className="relative">
          <span
            className={`absolute -left-[29px] top-8 h-3 w-3 rounded-full border-2 border-orange-200 bg-white shadow-[0_0_0_4px_rgba(251,146,60,0.2)] ${todayWeekLabel && entry.weekLabel === todayWeekLabel ? "animate-pulse" : ""}`}
          />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{entry.weekLabel}</p>
            {todayWeekLabel && entry.weekLabel === todayWeekLabel ? (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                Today
              </span>
            ) : null}
          </div>
          <article className="px-1 py-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${typeToneMap[entry.type]}`}>
                {entry.type}
              </span>
              <span className="text-[11px] text-muted">{entry.contributorName ?? "Site Contributor"} • {entry.contributorBadge ?? "Field Lead"}</span>
              <span className="text-[11px] text-muted">{entry.weekLabel} • {entry.createdAtLabel ?? "Site update"}</span>
            </div>
            <h3 className="text-lg font-semibold text-app">{entry.title}</h3>
            <p className="mt-2 text-sm leading-8 text-app/85">{entry.note}</p>

            {entry.aiSummary ? (
              <div className="mt-3 border-l-2 border-orange-300 pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">AI Observation</p>
                <p className="mt-1 text-xs leading-6 text-muted">{entry.aiSummary}</p>
              </div>
            ) : null}

            {entry.media.length ? (
              <div className="-mx-5 mt-5 grid grid-cols-1 gap-2 px-0 sm:grid-cols-2">
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] text-muted">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>{entry.commentsCount} discussion notes</span>
              {entry.linkedDiscussion ? (
                <Link href={entry.linkedDiscussion.href} className="text-orange-700 hover:text-orange-800">
                  Related discussion: {entry.linkedDiscussion.title}
                </Link>
              ) : null}
            </div>
          </article>
        </section>
      ))}
    </div>
  );
}
