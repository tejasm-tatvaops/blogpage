"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GithubSlugger from "github-slugger";
import { TrendingWidget } from "@/components/blog/TrendingWidget";
import { NewsletterSignup } from "@/components/blog/NewsletterSignup";

// ── ToC ──────────────────────────────────────────────────────────────────────

type TocEntry = { text: string; anchor: string; level: number };

function extractToc(markdown: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const entries: TocEntry[] = [];
  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const match = h2 ?? h3;
    if (!match) continue;
    const text = match[1].trim();
    entries.push({ text, anchor: slugger.slug(text), level: h2 ? 2 : 3 });
  }
  return entries.slice(0, 12);
}

// ── References ───────────────────────────────────────────────────────────────

function extractReferences(markdown: string): string[] {
  const lines = markdown.split("\n");
  let inSection = false;
  const refs: string[] = [];
  for (const line of lines) {
    if (/^##\s+references?/i.test(line)) { inSection = true; continue; }
    if (inSection && /^##/.test(line)) break;
    if (inSection) {
      const cleaned = line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      if (cleaned) refs.push(cleaned);
    }
  }
  return refs.slice(0, 8);
}

// ── Personalised tutorial recommendations (client-side) ───────────────────

const PROFILE_KEY = "tatvaops_user_profile";

type TutorialItem = { slug: string; title: string; excerpt: string; difficulty?: string; tags: string[] };

function scoreItems(items: TutorialItem[], viewedTags: Record<string, number>, viewedSlugs: string[], currentSlug: string): TutorialItem[] {
  return items
    .filter((t) => t.slug !== currentSlug && !viewedSlugs.includes(t.slug))
    .map((t) => ({
      item: t,
      score: t.tags.reduce((s, tag) => s + (viewedTags[tag] ?? 0) * 2, 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.item);
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced:     "bg-red-50 text-red-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

type TutorialSidebarProps = {
  currentSlug: string;
  content: string;
  tags: string[];
  relatedTutorials: TutorialItem[];
  linkedBlogSlug?: string | null;
};

export function TutorialSidebar({
  currentSlug,
  content,
  tags,
  relatedTutorials,
  linkedBlogSlug,
}: TutorialSidebarProps) {
  const toc = extractToc(content);
  const references = extractReferences(content);

  const [personalisedRecs, setPersonalisedRecs] = useState<TutorialItem[]>([]);
  const [whyTags, setWhyTags] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as {
        viewedTags?: Record<string, number>;
        viewedSlugs?: string[];
      };
      const viewedTags = profile.viewedTags ?? {};
      const viewedSlugs = profile.viewedSlugs ?? [];
      const recs = scoreItems(relatedTutorials, viewedTags, viewedSlugs, currentSlug);
      setPersonalisedRecs(recs);
      const topTags = Object.entries(viewedTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t)
        .filter((t) => tags.includes(t) || recs.some((r) => r.tags.includes(t)));
      setWhyTags(topTags);
    } catch {
      // localStorage unavailable
    }
  }, [relatedTutorials, currentSlug, tags]);

  const displayRecs = personalisedRecs.length > 0 ? personalisedRecs : relatedTutorials.slice(0, 4);

  return (
    <aside className="space-y-5">
      {/* ── Personalised / Next Learn ── */}
      {displayRecs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {mounted && personalisedRecs.length > 0 ? "Recommended for you" : "Next learn"}
            </span>
          </div>
          {mounted && whyTags.length > 0 && (
            <p className="border-b border-slate-50 bg-sky-50/60 px-4 py-2 text-[11px] text-sky-700">
              Because you viewed: {whyTags.map((t) => `#${t}`).join(", ")}
            </p>
          )}
          <ul className="divide-y divide-slate-100">
            {displayRecs.map((tutorial) => (
              <li key={tutorial.slug}>
                <Link
                  href={`/tutorials/${tutorial.slug}`}
                  className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-subtle"
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 transition group-hover:bg-indigo-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 transition group-hover:text-indigo-600" aria-hidden>
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug text-slate-800 transition group-hover:text-indigo-700 line-clamp-2">
                      {tutorial.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400 line-clamp-2">{tutorial.excerpt}</p>
                    {tutorial.difficulty && (
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${DIFFICULTY_COLORS[tutorial.difficulty] ?? "bg-slate-100 text-slate-600"}`}>
                        {tutorial.difficulty}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TrendingWidget />

      {/* ── Table of Contents ── */}
      {toc.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">In this tutorial</span>
          </div>
          <nav className="px-4 py-3">
            <ul className="space-y-0.5">
              {toc.map((entry) => (
                <li key={entry.anchor}>
                  <a
                    href={`#${entry.anchor}`}
                    className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-subtle ${entry.level === 3 ? "pl-5" : ""}`}
                  >
                    <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300 transition group-hover:bg-indigo-400" />
                    <span className="text-[13px] leading-snug text-slate-600 transition group-hover:text-app">
                      {entry.text}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5.05-5.05A7 7 0 1 0 9 21a7 7 0 0 0 4.95-2.05" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/tutorials?tag=${encodeURIComponent(tag)}`}
                className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-100 transition hover:bg-sky-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── References ── */}
      {references.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">References</span>
          </div>
          <ul className="space-y-2 px-4 py-3.5">
            {references.map((ref) => {
              const urlMatch = ref.match(/https?:\/\/[^\s]+/);
              return (
                <li key={ref} className="text-xs leading-relaxed text-slate-600">
                  •{" "}
                  {urlMatch ? (
                    <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {ref}
                    </a>
                  ) : (
                    ref
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Linked blog article ── */}
      {linkedBlogSlug && (
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/60">
          <div className="flex items-center gap-2 border-b border-sky-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">Go deeper</span>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-xs text-slate-600">
              Want the full depth?{" "}
              <Link href={`/blog/${linkedBlogSlug}`} className="font-semibold text-sky-600 hover:underline">
                Read the companion article →
              </Link>
            </p>
          </div>
        </div>
      )}

      <NewsletterSignup />

      {/* ── About TatvaOps ── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-200/30" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-indigo-200/30" />
        <div className="relative">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            TatvaOps
          </div>
          <h3 className="text-[15px] font-bold leading-snug text-app">Build smarter, not harder</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Step-by-step tutorials for construction teams — covering BOQ workflows, estimation tools, and site management.
          </p>
          <Link
            href="/tutorials"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold !text-white transition hover:bg-slate-700"
          >
            Browse all tutorials
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
