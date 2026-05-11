import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { OwnerJournalComposerLauncher } from "@/components/projects/OwnerJournalComposerLauncher";
import { WeeklyExecutiveBriefCard } from "@/components/projects/WeeklyExecutiveBriefCard";
import { SITE_JOURNALS } from "@/data/siteJournals";
import { getProjectBySlugPersistent, getSiteJournalMemoryInsights } from "@/lib/siteJournalService";
import { authOptions } from "@/lib/auth";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ startFieldNote?: string }>;
};

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlugPersistent(slug, true);
  if (!project) return { title: "Site Journal not found | TatvaOps" };
  const canonicalUrl = `${SITE_URL}/projects/${project.slug}`;
  const socialImage =
    project.mediaCover && (project.mediaCover.startsWith("http://") || project.mediaCover.startsWith("https://"))
      ? project.mediaCover
      : project.mediaCover
        ? `${SITE_URL}${project.mediaCover.startsWith("/") ? project.mediaCover : `/${project.mediaCover}`}`
        : undefined;
  return {
    title: `${project.title} | Site Journal | TatvaOps`,
    description: project.aiSummary,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: `${project.title} | Site Journal`,
      description: project.aiSummary,
      siteName: "TatvaOps",
      ...(socialImage ? { images: [{ url: socialImage, alt: project.title }] } : {}),
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title: `${project.title} | Site Journal`,
      description: project.aiSummary,
      ...(socialImage ? { images: [socialImage] } : {}),
      site: "@tatvaops",
    },
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
  const linkedDiscussion = project.timelineEntries.find((entry) => entry.linkedDiscussion)?.linkedDiscussion;
  const inlineNotes = memoryInsights.length ? memoryInsights.slice(0, 3) : project.recommendations.slice(0, 3);
  const weeklySummary = [
    project.aiRiskPulse,
    `${project.executionStatus}.`,
    `${project.procurementSignal}.`,
    project.recommendations[0] ?? "Maintain close monitoring on upcoming execution dependencies.",
  ];
  const healthHistory = [...project.timelineEntries]
    .sort((a, b) => {
      const aw = Number(a.weekLabel.replace(/[^\d]/g, "")) || 0;
      const bw = Number(b.weekLabel.replace(/[^\d]/g, "")) || 0;
      return bw - aw;
    })
    .slice(0, 4)
    .map((entry) => {
      const tone =
        entry.type === "Issue Report" || entry.type === "Cost Change"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : entry.type === "Procurement Decision" || entry.type === "Vendor Note" || entry.type === "Labor Update"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
      const state =
        entry.type === "Issue Report" || entry.type === "Cost Change"
          ? "Delay Risk"
          : entry.type === "Procurement Decision" || entry.type === "Vendor Note"
            ? "Watch Procurement"
            : entry.type === "Labor Update"
              ? "Labor Watch"
              : "Stable";
      return { week: entry.weekLabel, state, tone };
    });
  const mostRecentEntry = project.timelineEntries[0];
  const priorEntry = project.timelineEntries[1];
  const laborCondition =
    project.aiRiskPulse.toLowerCase().includes("labor") || project.executionStatus.toLowerCase().includes("labor")
      ? "Labor sensitivity detected in active cycle."
      : "No major labor disruption signal detected in current cycle.";
  const nextWeekForecast =
    project.health === "risk"
      ? "High probability of schedule pressure unless vendor and sequencing mitigation is executed this week."
      : project.health === "watch"
        ? "Moderate pressure likely; procurement stabilization can prevent spillover into execution milestones."
        : "Execution likely to remain stable if current controls and sequencing discipline hold.";
  const briefActions = [
    project.recommendations[0] ?? "Reconfirm vendor sequence and delivery commitments before next cycle.",
    project.recommendations[1] ?? "Track labor allocation and remove overlaps that can cause rework.",
    project.recommendations[2] ?? "Keep weekly risk review cadence with documented corrective actions.",
  ];

  return (
    <main className="mx-auto w-full max-w-[1280px] px-3 pb-16 pt-4 sm:px-4 lg:px-6">
      <section className="rounded-3xl bg-surface px-3 py-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] ring-1 ring-app/70 sm:px-4 sm:py-6 lg:px-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-orange-500">Living Site Journal</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-app sm:text-4xl md:text-5xl">{project.title}</h1>
          <p className="mt-3 text-xs text-muted">
            Maintained by {project.leadContributor.name} • {project.leadContributor.badge} • Tracking since {project.timeline.started}
          </p>
          <p className="mt-1 text-xs text-muted">
            Week {project.timeline.week} active • Last field update {project.timelineEntries[0]?.createdAtLabel ?? "recently"}
          </p>
        </div>
      </section>

      <section className="mt-8 max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-orange-600">Chronicle Intro</p>
        <p className="mt-3 text-[15px] leading-7 text-app/85 sm:text-base sm:leading-8">
          This journal documents the evolving execution realities, procurement decisions, labor coordination, and site-level risks across the {project.title} build. Each weekly note captures what shifted on site, what pressure emerged, and how the team responded in real time.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {project.contributors.map((c) => (
            <span key={`${c.name}-${c.badge}`} className="rounded-full bg-surface px-3 py-1 text-muted shadow-sm ring-1 ring-app/70">
              {c.name} • {c.badge}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 max-w-5xl">
        <div className="mb-10 space-y-4 border-l border-orange-300/65 pl-4 sm:pl-6">
          <p className="text-sm leading-7 text-app/85">{project.aiRiskPulse}</p>
          <p className="text-sm leading-7 text-app/85">
            Execution pattern: {project.executionStatus}. Similar sequencing pressure appeared in {project.similarProjects[0] ?? "related regional journals"}.
          </p>
          {linkedDiscussion ? (
            <p className="text-sm leading-7 text-app/85">
              Related discussion:{" "}
              <Link href={linkedDiscussion.href} className="text-orange-700 hover:text-orange-800">
                {linkedDiscussion.title}
              </Link>
            </p>
          ) : null}
          {inlineNotes.map((item) => (
            <p key={item} className="text-sm leading-7 text-muted">
              {item}
            </p>
          ))}
          {priorEntry ? (
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Continuity: previously observed in {priorEntry.weekLabel} during {priorEntry.type.toLowerCase()} signals.
            </p>
          ) : null}
        </div>

        <div className="mb-8">
          <WeeklyExecutiveBriefCard
            projectTitle={project.title}
            week={project.timeline.week}
            changed={mostRecentEntry?.title ?? project.updatePreview}
            risk={project.aiRiskPulse}
            procurement={project.procurementSignal}
            executionHealth={project.executionStatus}
            laborCondition={laborCondition}
            nextWeekForecast={nextWeekForecast}
            actions={briefActions}
          />
        </div>

        <ProjectTimeline
          entries={project.timelineEntries}
          todayWeekLabel={`Week ${project.timeline.week}`}
          totalWeeks={project.timeline.week}
          timelineStarted={project.timeline.started}
          siteConditions={[
            { label: "Weather", value: project.weatherRisk },
            { label: "Material Watch", value: project.procurementSignal },
            { label: "Discussion", value: `${project.activeDiscussionCount} notes active` },
            { label: "Site Mood", value: project.health === "risk" ? "Under pressure" : project.health === "watch" ? "Tightening windows" : "Steady" },
          ]}
          askContextBase={{
            projectSlug: project.slug,
            journalTitle: project.title,
            cityRegion: `${project.city}, ${project.region}`,
            risks: project.aiRiskPulse,
            tags: project.tags.join(", "),
            discussions: project.timelineEntries.map((entry) => entry.linkedDiscussion?.title).filter(Boolean).join("; "),
            expertise: project.contributors.map((member) => member.badge).join(", "),
            similarProjects: project.similarProjects,
          }}
        />

        <div className="mt-14 rounded-2xl bg-subtle/30 p-6 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.28)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Next Unwritten Page</p>
          <p className="mt-2 text-base text-app/85">Continue documenting this site&apos;s execution story.</p>
          <div className="mt-4">
            {isOwner ? (
              <OwnerJournalComposerLauncher
                slug={project.slug}
                currentWeek={project.timeline.week}
                currentSummary={project.aiRiskPulse}
                showFirstNoteHint={startFieldNote || project.timelineEntries.length === 0}
                tone="light"
              />
            ) : (
              <p className="text-sm text-muted">Only the site journal maintainer can continue this weekly chronicle.</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-orange-50 p-5 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.25)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">This Week • Field Summary</p>
          <ul className="mt-3 space-y-1 text-sm text-orange-900">
            {weeklySummary.map((line) => (
              <li key={line}>- {line}</li>
            ))}
          </ul>
        </div>

        <details className="mt-10 rounded-2xl bg-surface p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] ring-1 ring-app/70">
          <summary className="cursor-pointer select-none text-sm font-semibold text-app">Field Appendix (signals, memory, and related intelligence)</summary>
          <div className="mt-4 space-y-6">
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Execution Health History</p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {healthHistory.map((item) => (
                  <div key={item.week} className={`rounded-xl p-2 text-xs shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)] ${item.tone}`}>
                    <p className="font-semibold">{item.week}</p>
                    <p className="mt-1">{item.state}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Active Risks</p>
                <p className="mt-2 text-sm leading-7 text-muted">{project.aiRiskPulse}</p>
              </div>
              <div className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">AI Recommendations</p>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  {project.recommendations.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Related Site Journals</p>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  {project.similarProjects.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Relevant Experts</p>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  {project.relatedExperts.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Site Memory</p>
              <div className="mt-2 space-y-1 text-sm text-muted">
                {(memoryInsights.length
                  ? memoryInsights
                  : [
                      `Referenced earlier: supplier risk first surfaced in Week ${Math.max(1, project.timeline.week - 4)}.`,
                      "Recurring pattern: labor sensitivity appears during high logistics volatility windows.",
                      `AI continuity: similar sequence observed in ${project.similarProjects[0] ?? "related regional journals"}.`,
                    ]
                ).map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-surface p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Related Intelligence Graph</p>
              <div className="mt-2 space-y-1 text-sm text-muted">
                <p>- Related discussions: {project.timelineEntries.find((e) => e.linkedDiscussion)?.linkedDiscussion?.title ?? "Execution risk discussions"}</p>
                <p>- Regional market signal: {project.city} procurement volatility watch.</p>
                <p>- Related Inshorts: Execution quick briefs for {project.marketType.toLowerCase()}.</p>
              </div>
            </section>
          </div>
        </details>

        <div className="mt-10 space-y-3 border-l border-app/70 pl-6 text-sm text-muted">
          <p>Explore related intelligence from this journal:</p>
          <div className="flex flex-wrap gap-2">
            {askPrompts.map((prompt) => {
              const askParams = new URLSearchParams({
                prompt,
                anchor: `sj:${project.slug}`,
                sourceType: "siteJournal",
                aiMode: "site_analyst",
                page: "site_journal",
                journal: project.title,
                week: String(project.timeline.week),
                city: `${project.city}, ${project.region}`,
                risks: project.aiRiskPulse,
                tags: project.tags.join(", "),
                discussions: project.timelineEntries.map((entry) => entry.linkedDiscussion?.title).filter(Boolean).join("; "),
                expertise: project.contributors.map((member) => member.badge).join(", "),
                intent: prompt,
              });
              return (
                <Link key={prompt} href={`/ask?${askParams.toString()}`} className="rounded-full bg-surface px-3 py-1.5 text-xs text-app shadow-sm ring-1 ring-app/70 transition hover:-translate-y-0.5 hover:bg-subtle">
                  {prompt}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
