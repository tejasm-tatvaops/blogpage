import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { OwnerJournalComposerLauncher } from "@/components/projects/OwnerJournalComposerLauncher";
import { SITE_JOURNALS } from "@/data/siteJournals";
import { getProjectBySlugPersistent, getSiteJournalMemoryInsights } from "@/lib/siteJournalService";
import { authOptions } from "@/lib/auth";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ startFieldNote?: string }>;
};

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlugPersistent(slug, true);
  if (!project) return { title: "Site Journal not found | TatvaOps" };
  return {
    title: `${project.title} | Site Journal | TatvaOps`,
    description: project.aiSummary,
  };
}

export function generateStaticParams() {
  return SITE_JOURNALS.map((project) => ({ slug: project.slug }));
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlugPersistent(slug, true);
  if (!project) notFound();
  const memoryInsights = await getSiteJournalMemoryInsights(slug).catch(() => []);
  const session = await getServerSession(authOptions);
  const viewerIdentity = session?.user?.id ? `google:${session.user.id}` : "";
  const isOwner = viewerIdentity !== "" && viewerIdentity === project.leadContributor.identityKey;
  const startFieldNote = (searchParams ? await searchParams : undefined)?.startFieldNote === "true";

  const askPrompts = [
    `Analyze this site journal's procurement strategy and key risk drivers: ${project.title}.`,
    `Compare this ${project.city} site journal with similar regional journals and highlight execution risks.`,
    `Predict budget and site timeline risk for ${project.title} using current journal signals.`,
    `Suggest vendor diversification and labor mitigation actions for ${project.title}.`,
  ];

  const weeklySummary = [
    project.aiRiskPulse,
    `${project.executionStatus}.`,
    `${project.procurementSignal}.`,
    project.recommendations[0] ?? "Maintain close monitoring on upcoming execution dependencies.",
  ];

  const healthHistory = [
    { week: "Week 10", state: "Stable", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { week: "Week 12", state: "Watch Procurement", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { week: "Week 13", state: "Delay Risk", tone: "bg-rose-50 text-rose-700 border-rose-200" },
    { week: "Week 15", state: "Stabilized", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 p-6">
        <img
          src={project.mediaCover}
          alt={project.title}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/55 to-slate-950/85" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs uppercase tracking-[0.13em] text-orange-200">Site Journal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{project.title}</h1>
            <p className="mt-2 text-sm text-white/75">
              {project.projectType} - {project.city}, {project.region} ({project.marketType})
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-white/80">Started {project.timeline.started}</span>
              <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-white/80">{project.timeline.week} weeks active</span>
              <span className="rounded-full border border-orange-300/40 bg-orange-500/10 px-3 py-1 text-orange-100">{project.leadContributor.badge}</span>
            </div>
            <p className="mt-3 text-xs text-white/70">
              Maintained by {project.leadContributor.name} • {project.leadContributor.badge} • Tracking since {project.timeline.started}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">{project.aiSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.contributors.map((contributor) => (
                <span key={`${contributor.name}-${contributor.badge}`} className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-white/80">
                  {contributor.name} - {contributor.badge}
                </span>
              ))}
            </div>
          </div>
          <aside className="space-y-3 rounded-2xl border border-white/15 bg-slate-900/70 p-4 backdrop-blur">
            <h2 className="text-sm font-semibold text-white">Site Intelligence</h2>
            <p className="text-xs text-white/80">Budget: {project.budgetRange}</p>
            <p className="text-xs text-white/80">Procurement: {project.procurementSignal}</p>
            <p className="text-xs text-white/80">Execution: {project.executionStatus}</p>
            <p className="text-xs text-white/80">Weather/Risk: {project.weatherRisk}</p>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-white/75">
                <span>{project.timeline.stage}</span>
                <span>{project.timeline.progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-amber-300" style={{ width: `${project.timeline.progressPercent}%` }} />
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {askPrompts.map((prompt) => (
                (() => {
                  const askParams = new URLSearchParams({
                    prompt,
                    anchor: `sj:${project.slug}`,
                    journal: project.title,
                    week: String(project.timeline.week),
                    city: `${project.city}, ${project.region}`,
                    risks: project.aiRiskPulse,
                    tags: project.tags.join(", "),
                    discussions: project.timelineEntries
                      .map((entry) => entry.linkedDiscussion?.title)
                      .filter(Boolean)
                      .join("; "),
                    expertise: project.contributors.map((member) => member.badge).join(", "),
                  });
                  return (
                <Link
                  key={prompt}
                  href={`/ask?${askParams.toString()}`}
                  className="block rounded-lg border border-white/30 bg-white/95 px-2.5 py-2 text-xs font-medium text-slate-900 transition hover:bg-white"
                >
                  {prompt}
                </Link>
                  );
                })()
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="sticky top-20 z-10 mb-8 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">AI Weekly Site Summary</p>
            <ul className="mt-2 space-y-1 text-sm text-orange-900">
              {weeklySummary.map((line) => <li key={line}>- {line}</li>)}
            </ul>
          </div>

          <section className="mb-6 rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-sm font-semibold text-app">Execution Health History</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {healthHistory.map((item) => (
                <div key={item.week} className={`rounded-xl border p-2 text-xs ${item.tone}`}>
                  <p className="font-semibold">{item.week}</p>
                  <p className="mt-1">{item.state}</p>
                </div>
              ))}
            </div>
          </section>

          <h2 className="mb-4 text-xl font-semibold text-app">Site Timeline</h2>
          <ProjectTimeline entries={project.timelineEntries} todayWeekLabel={`Week ${project.timeline.week}`} />
          {isOwner ? (
            <div className="mt-6 rounded-2xl border border-app bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Next Chronicle</p>
              <p className="mt-1 text-sm text-app">Document the next execution update to continue this living site diary.</p>
              <div className="mt-3">
                <OwnerJournalComposerLauncher
                  slug={project.slug}
                  currentWeek={project.timeline.week}
                  currentSummary={project.aiRiskPulse}
                  showFirstNoteHint={startFieldNote || project.timelineEntries.length === 0}
                />
              </div>
            </div>
          ) : null}
        </div>
        <aside className="space-y-3">
          {isOwner ? (
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50 to-orange-100/70 p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">Owner Actions</h3>
              <div className="mt-2 space-y-2">
                <OwnerJournalComposerLauncher
                  slug={project.slug}
                  currentWeek={project.timeline.week}
                  currentSummary={project.aiRiskPulse}
                  showFirstNoteHint={startFieldNote || project.timelineEntries.length === 0}
                />
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Active Risks</h3>
            <p className="mt-2 text-xs text-muted">{project.aiRiskPulse}</p>
          </div>
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Related Site Journals</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              {project.similarProjects.map((item) => <p key={item}>- {item}</p>)}
            </div>
          </div>
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Relevant Experts</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              {project.relatedExperts.map((item) => <p key={item}>- {item}</p>)}
            </div>
          </div>
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">AI Recommendations</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              {project.recommendations.map((item) => <p key={item}>- {item}</p>)}
            </div>
          </div>
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Site Memory</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              {(memoryInsights.length ? memoryInsights : [
                `Referenced earlier: supplier risk first surfaced in Week ${Math.max(1, project.timeline.week - 4)}.`,
                "Recurring pattern: labor sensitivity appears during high logistics volatility windows.",
                `AI continuity: similar sequence observed in ${project.similarProjects[0] ?? "related regional journals"}.`,
              ]).map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-app/70 bg-surface p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Related Intelligence Graph</h3>
            <div className="mt-2 space-y-1 text-xs text-muted">
              <p>- Related discussions: {project.timelineEntries.find((e) => e.linkedDiscussion)?.linkedDiscussion?.title ?? "Execution risk discussions"}</p>
              <p>- Regional market signal: {project.city} procurement volatility watch.</p>
              <p>- Related Inshorts: Execution quick briefs for {project.marketType.toLowerCase()}.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
