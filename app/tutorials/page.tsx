import type { Metadata } from "next";
import Link from "next/link";
import { getTutorials, getLearningPaths } from "@/lib/tutorialService";

export const metadata: Metadata = {
  title: "Tutorials",
  description: "Step-by-step tutorials, onboarding guides, and learning paths for TatvaOps users.",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  advanced:     "bg-red-50 text-red-700 border-red-200",
};

type Tutorial = {
  _id: { toString(): string };
  slug: string;
  title: string;
  excerpt: string;
  difficulty: string;
  estimated_minutes: number;
  tags: string[];
  content_type: string;
  created_at: Date;
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
  searchParams: Promise<{ difficulty?: string; tag?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const difficulty = sp.difficulty ?? null;
  const tag  = sp.tag  ?? null;
  const query = sp.q  ?? null;

  const [{ tutorials, total }, paths] = await Promise.all([
    getTutorials({ difficulty: difficulty as "beginner" | "intermediate" | "advanced" | null, tag, query, limit: 30 }),
    getLearningPaths(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Tutorials & Guides
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-500">
          Learn to use TatvaOps effectively — from quick onboarding to advanced construction
          estimation techniques.
        </p>
      </div>

      {/* Learning Paths */}
      {paths.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Learning Paths</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(paths as unknown as LearningPath[]).map((path) => (
              <Link
                key={path._id.toString()}
                href={`/tutorials?path=${path.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow"
              >
                <h3 className="font-semibold text-slate-800 group-hover:text-sky-700">
                  {path.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{path.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  ~{path.estimated_total_minutes} min total
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Difficulty filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "beginner", "intermediate", "advanced"].map((d) => {
          const active = (d === "all" && !difficulty) || d === difficulty;
          const href = d === "all" ? "/tutorials" : `/tutorials?difficulty=${d}`;
          return (
            <Link
              key={d}
              href={href}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition ${
                active
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {d}
            </Link>
          );
        })}
        <span className="ml-auto text-sm text-slate-400 self-center">{total} tutorials</span>
      </div>

      {/* Tutorial cards */}
      {tutorials.length === 0 ? (
        <div className="py-20 text-center text-slate-400">No tutorials found.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(tutorials as unknown as Tutorial[]).map((t) => (
            <Link
              key={t._id.toString()}
              href={`/tutorials/${t.slug}`}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                    DIFFICULTY_COLORS[t.difficulty] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.difficulty}
                </span>
                {t.content_type === "video" && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    Video
                  </span>
                )}
                {t.content_type === "hybrid" && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    Hybrid
                  </span>
                )}
              </div>

              <h3 className="flex-1 font-semibold text-slate-800 group-hover:text-sky-700 line-clamp-2">
                {t.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500 line-clamp-2">{t.excerpt}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{t.estimated_minutes} min read</span>
                {t.tags[0] && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                    {t.tags[0]}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
