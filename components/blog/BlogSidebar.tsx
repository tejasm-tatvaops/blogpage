import Link from "next/link";
import GithubSlugger from "github-slugger";
import type { BlogPost } from "@/lib/blogService";
import { NewsletterSignup } from "./NewsletterSignup";
import { TrendingWidget } from "./TrendingWidget";
import { RecommendationPanel } from "./RecommendationPanel";

type TocEntry = { text: string; anchor: string; level: number };

/** Extract H2 and H3 headings from raw markdown to build a Table of Contents.
 *  Uses github-slugger — the same library rehype-slug uses — so the anchors
 *  always match the id attributes on the rendered headings. */
function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const entries: TocEntry[] = [];
  const slugger = new GithubSlugger();

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const match = h2 ?? h3;
    if (!match) continue;

    const text = match[1].trim();
    const anchor = slugger.slug(text);

    entries.push({ text, anchor, level: h2 ? 2 : 3 });
  }

  return entries.slice(0, 12);
}

type BlogSidebarProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
  recommendationCandidates?: BlogPost[];
  categories: string[];
  tocMarkdown?: string;
  faqs?: Array<{ question: string; answer: string }>;
  references?: string[];
};

export function BlogSidebar({
  post,
  relatedPosts,
  recommendationCandidates = [],
  categories,
  tocMarkdown,
  faqs = [],
  references = [],
}: BlogSidebarProps) {
  const toc = extractToc(tocMarkdown ?? post.content);

  return (
    <aside className="space-y-5">
      <RecommendationPanel
        currentPost={post}
        allPosts={[post, ...(recommendationCandidates.length > 0 ? recommendationCandidates : relatedPosts)]}
        usePreRanked={recommendationCandidates.length > 0}
      />
      <TrendingWidget />

      {/* ── Table of Contents ── */}
      {toc.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">In this article</span>
          </div>
          <nav className="px-4 py-3">
            <ul className="space-y-0.5">
              {toc.map((entry) => (
                <li key={entry.anchor}>
                  <a
                    href={`#${entry.anchor}`}
                    className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-subtle ${
                      entry.level === 3 ? "pl-5" : ""
                    }`}
                  >
                    <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300 transition group-hover:bg-sky-400" />
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

      {/* ── FAQs ── */}
      {faqs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">FAQs</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {faqs.slice(0, 6).map((faq) => (
              <li key={faq.question} className="px-4 py-3.5">
                <p className="text-xs font-semibold text-app">{faq.question}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{faq.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── References ── */}
      {references.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">References</span>
          </div>
          <ul className="space-y-2 px-4 py-3.5">
            {references.slice(0, 8).map((reference) => {
              const urlMatch = reference.match(/https?:\/\/[^\s]+/);
              return (
                <li key={reference} className="text-xs leading-relaxed text-slate-600">
                  •{" "}
                  {urlMatch ? (
                    <a
                      href={urlMatch[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {reference}
                    </a>
                  ) : (
                    reference
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Topics / Categories ── */}
      {categories.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Topics</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/blog?category=${encodeURIComponent(cat)}`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  cat === post.category
                    ? "bg-slate-900 !text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-app"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Tags ── */}
      {post.tags.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5.05-5.05A7 7 0 1 0 9 21a7 7 0 0 0 4.95-2.05" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-3.5">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-100 transition hover:bg-sky-100"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Related Posts ── */}
      {relatedPosts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-app bg-surface">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Related reading</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {relatedPosts.slice(0, 4).map((related) => (
              <li key={related.id}>
                <Link
                  href={`/blog/${related.slug}`}
                  className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-subtle"
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 transition group-hover:bg-sky-100">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-sky-600 transition" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-snug text-slate-800 transition group-hover:text-sky-700 line-clamp-2">
                      {related.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400 line-clamp-2">
                      {related.excerpt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Newsletter ── */}
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
          <h3 className="text-[15px] font-bold leading-snug text-app">
            Build smarter, not harder
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Helping construction teams estimate accurately — with BOQ workflows, vendor cost benchmarks, and procurement intelligence.
          </p>
          <Link
            href="/blog"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold !text-white transition hover:bg-slate-700"
          >
            Explore all articles
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

    </aside>
  );
}
