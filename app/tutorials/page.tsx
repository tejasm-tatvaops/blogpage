import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getTutorials, getLearningPaths } from "@/lib/tutorialService";
import { extractVideoSource, getTutorialVideoSource, getYoutubeThumbnailUrlFromSourceUrl } from "@/lib/tutorialVideo";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");
const TUTORIALS_URL = `${SITE_URL}/tutorials`;

export const metadata: Metadata = {
  title: "Tutorials",
  description: "Step-by-step tutorials, onboarding guides, and learning paths for TatvaOps users.",
  alternates: { canonical: TUTORIALS_URL },
  openGraph: {
    type: "website",
    url: TUTORIALS_URL,
    title: "Tutorials & Guides | TatvaOps",
    description: "Step-by-step tutorials and practical learning paths for construction workflows and estimation.",
    siteName: "TatvaOps",
  },
  twitter: {
    card: "summary",
    title: "Tutorials & Guides | TatvaOps",
    description: "Learn construction estimation and execution workflows with practical TatvaOps tutorials.",
    site: "@tatvaops",
  },
};

const DIFFICULTY_STYLES: Record<string, { pill: string; label: string }> = {
  beginner:     { pill: "bg-orange-500 text-white",                                                label: "BEGINNER"     },
  intermediate: { pill: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30",                       label: "INTERMEDIATE" },
  advanced:     { pill: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",                       label: "ADVANCED"     },
};

type Tutorial = {
  _id: { toString(): string };
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  difficulty: string;
  estimated_minutes: number;
  tags: string[];
  content_type: string;
  created_at: Date;
  cover_image?: string | null;
};

type LearningPath = {
  _id: { toString(): string };
  slug: string;
  title: string;
  description: string;
  estimated_total_minutes: number;
};

export default async function TutorialsPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; tag?: string; q?: string; path?: string }>;
}) {
  const sp = await searchParams;
  const difficulty = sp.difficulty ?? null;
  const tag  = sp.tag  ?? null;
  const query = sp.q  ?? null;
  const path = sp.path ?? null;

  const [{ tutorials, total }, paths] = await Promise.all([
    getTutorials({
      difficulty: difficulty as "beginner" | "intermediate" | "advanced" | null,
      tag,
      query,
      learningPathSlug: path,
      limit: 30,
      includeContent: true,
    }),
    getLearningPaths(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="mb-12">
        <h1 className="text-[28px] font-bold tracking-tight text-app sm:text-[32px]">
          Tutorials &amp; Guides
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#64748b] dark:text-[#8b92a8]">
          Learn to use TatvaOps effectively — from quick onboarding to advanced construction
          estimation techniques.
        </p>
      </div>

      {/* ── Learning Paths ───────────────────────────────────────────────────── */}
      {paths.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-[13.5px] font-semibold uppercase tracking-[0.08em] text-[#8b92a8]">Learning Paths</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(paths as unknown as LearningPath[]).map((path) => (
              <Link
                key={path._id.toString()}
                href={`/tutorials?path=${path.slug}`}
                className="group rounded-[12px] border border-black/10 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] dark:border-[#1e2440] dark:bg-[#0d1128] dark:hover:border-orange-500/20 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              >
                <h3 className="text-[14px] font-semibold text-slate-800 transition group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                  {path.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-[#8b92a8]">{path.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.06em] text-[#8b92a8]">
                  ~{path.estimated_total_minutes} min total
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Difficulty filter bar ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-center gap-2.5">
        {["all", "beginner", "intermediate", "advanced"].map((d) => {
          const active = (d === "all" && !difficulty) || d === difficulty;
          const href = d === "all" ? "/tutorials" : `/tutorials?difficulty=${d}`;
          return (
            <Link
              key={d}
              href={href}
              className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] transition ${
                active
                  ? "bg-orange-500 !text-white shadow-[0_0_12px_rgba(234,88,12,0.25)]"
                  : "border border-black/10 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600 dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/30 dark:hover:text-orange-400"
              }`}
            >
              {d === "all" ? "All" : d}
            </Link>
          );
        })}
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[#1e2440] bg-[#0d1128] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8b92a8]">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden />
          {total} Tutorials
        </span>
      </div>

      {/* ── Tutorial cards ────────────────────────────────────────────────── */}
      {tutorials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1e2440] py-20 text-center text-[13.5px] text-[#8b92a8]">
          No tutorials found.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {(tutorials as unknown as Tutorial[]).map((t) => {
            const diffStyle = DIFFICULTY_STYLES[t.difficulty] ?? { pill: "bg-white/10 text-white/60", label: t.difficulty.toUpperCase() };

            const mediaEl = (() => {
              if (t.content_type !== "video") return null;
              const sourceUrl = extractVideoSource(t.content);
              if (!sourceUrl) return null;
              const videoSource = getTutorialVideoSource(sourceUrl);
              const cover = t.cover_image?.trim() || null;

              const posterShell = (inner: ReactNode) => (
                <div className="relative isolate h-44 w-full bg-neutral-900">
                  {inner}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-2 ring-white/25 backdrop-blur-[2px]"
                      aria-hidden
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                        <path d="M8 5.14v14l11-7-11-7z" />
                      </svg>
                    </span>
                  </div>
                </div>
              );

              if (videoSource.kind === "youtube") {
                const poster = getYoutubeThumbnailUrlFromSourceUrl(sourceUrl);
                if (!poster) return null;
                return posterShell(
                  <img
                    src={poster}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />,
                );
              }

              /* Direct / uploaded file: never show native controls on listing — poster or muted first frame */
              if (cover) {
                return posterShell(
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />,
                );
              }
              return posterShell(
                <video
                  src={videoSource.url}
                  muted
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  className="h-full w-full object-cover pointer-events-none select-none"
                  aria-hidden
                />,
              );
            })();

            const hasMedia = Boolean(mediaEl);

            return (
              <Link
                key={t._id.toString()}
                href={`/tutorials/${t.slug}`}
                className="group flex flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm transition-all duration-[250ms] hover:-translate-y-0.5 hover:border-orange-300/40 hover:shadow-[0_14px_28px_rgba(15,23,42,0.14)] dark:border-[#1e2440] dark:bg-[#0d1128] dark:hover:border-orange-500/20 dark:hover:shadow-[0_14px_30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(249,115,22,0.08)]"
              >
                {/* Media top — badges overlaid */}
                {hasMedia && (
                  <div className="relative overflow-hidden bg-black">
                    <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none ${diffStyle.pill}`}>
                        {diffStyle.label}
                      </span>
                      {t.content_type === "video" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none text-white/90 backdrop-blur-sm">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.14v14l11-7-11-7z" /></svg>
                          Video
                        </span>
                      )}
                      {t.content_type === "hybrid" && (
                        <span className="rounded-full bg-violet-500/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none text-white">
                          Hybrid
                        </span>
                      )}
                    </div>
                    {mediaEl}
                  </div>
                )}

                {/* Body */}
                <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                  {/* Badges when no media */}
                  {!hasMedia && (
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none ${diffStyle.pill}`}>
                        {diffStyle.label}
                      </span>
                      {t.content_type === "video" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#1e2440] bg-[#141830] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none text-[#8b92a8]">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.14v14l11-7-11-7z" /></svg>
                          Video
                        </span>
                      )}
                      {t.content_type === "hybrid" && (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none text-violet-400 ring-1 ring-violet-500/30">
                          Hybrid
                        </span>
                      )}
                      {t.content_type === "article" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#1e2440] bg-[#141830] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em] leading-none text-[#8b92a8]">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
                          Article
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-800 transition group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-[#8b92a8]">
                    {t.excerpt}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-500 transition group-hover:text-orange-400">
                      {t.content_type === "video" ? "Watch Tutorial" : "Read Article"} →
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#4d5470]">
                      {t.content_type === "video" ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      )}
                      {t.estimated_minutes} min {t.content_type === "video" ? "watch" : "read"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
