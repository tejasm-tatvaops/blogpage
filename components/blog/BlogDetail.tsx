import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import type { Comment } from "@/lib/services/comment.service";
import type { ForumPost } from "@/lib/forumService";
import { calculateReadingTime } from "@/lib/blogService";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { UpvoteButton } from "./UpvoteButton";
import { DownvoteButton } from "./DownvoteButton";
import { ShareButtons } from "./ShareButtons";
import { CommentSection } from "./CommentSection";
import { BlogSidebar } from "./BlogSidebar";
import { ViewCount } from "./ViewCount";
import { ReadingProgressBar } from "./ReadingProgressBar";
import { CoverImage } from "./CoverImage";
import { AiAssistant } from "./AiAssistant";
import { BookmarkButton } from "./BookmarkButton";
import { ReadingTracker } from "./ReadingTracker";
import type { EngagedUserProfile } from "@/lib/userProfileService";
import { BlogActiveUsersStrip } from "@/components/users/BlogActiveUsersStrip";
import { UserProfileQuickView } from "@/components/user/UserQuickView";
import { KnowledgeEcosystemPanel } from "@/components/knowledge/KnowledgeEcosystemPanel";

type BlogDetailProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
  semanticRecommendations?: BlogPost[];
  categories: string[];
  comments: Comment[];
  forumSlug?: string | null;
  topicUsers?: EngagedUserProfile[];
  relatedForumPosts?: ForumPost[];
  relatedTutorials?: Array<{ slug: string; title: string; excerpt: string; difficulty?: string }>;
  relatedShorts?: Array<{ slug: string; title: string; summary: string }>;
  approvedRevisionCount?: number;
  lastReviewer?: string;
  lastReviewedAt?: string;
};

type ParsedFaq = {
  question: string;
  answer: string;
};

const parseContentSections = (
  markdown: string,
): { mainContent: string; faqs: ParsedFaq[]; references: string[] } => {
  const lines = markdown.split("\n");
  const sections: Array<{ heading: string; body: string[] }> = [];
  let current: { heading: string; body: string[] } | null = null;
  const intro: string[] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
    else intro.push(line);
  }
  if (current) sections.push(current);

  const faqSection = sections.find((s) => /^faqs?$/i.test(s.heading));
  const referencesSection = sections.find((s) => /^references$/i.test(s.heading));
  const mainSections = sections.filter((s) => !/^faqs?$/i.test(s.heading) && !/^references$/i.test(s.heading));

  const faqs: ParsedFaq[] = [];
  if (faqSection) {
    const faqLines = faqSection.body.map((l) => l.trim()).filter(Boolean);
    let pendingQuestion = "";
    for (const line of faqLines) {
      const q = line.match(/^Q\d*[:.)-]?\s*(.+)$/i);
      if (q) {
        pendingQuestion = q[1].trim();
        continue;
      }
      const a = line.match(/^A\d*[:.)-]?\s*(.+)$/i);
      if (a && pendingQuestion) {
        faqs.push({ question: pendingQuestion, answer: a[1].trim() });
        pendingQuestion = "";
      }
    }
  }

  const references = (referencesSection?.body ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter(Boolean);

  const rebuilt = [
    intro.join("\n").trim(),
    ...mainSections.map((section) => `## ${section.heading}\n${section.body.join("\n").trim()}`),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return { mainContent: rebuilt || markdown, faqs, references };
};

const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));

const relativeDate = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
};

export function BlogDetail({
  post,
  relatedPosts,
  semanticRecommendations = [],
  categories,
  comments,
  topicUsers = [],
  relatedForumPosts = [],
  relatedTutorials = [],
  relatedShorts = [],
  approvedRevisionCount = 0,
  lastReviewer,
  lastReviewedAt,
}: BlogDetailProps) {
  const readingTimeMinutes = calculateReadingTime(post.content);
  const imageUrl = post.cover_image || "";
  const { mainContent, faqs, references } = parseContentSections(post.content);

  const authorInitial = post.author.charAt(0).toUpperCase();
  const authorIdentityKey = `legacy:blog-author:${post.author.trim().toLowerCase()}`;

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-10">

          {/* ── Main article column ── */}
          <article className="min-w-0 flex-1">

            {/* ── Article header ── */}
            <header className="mb-8">
              {/* Category badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.13em] text-sky-600 ring-1 ring-inset ring-sky-100">
                {post.category}
              </span>

              {/* Title */}
              <h1 className="mt-4 text-3xl font-extrabold leading-[1.2] tracking-[-0.02em] text-app sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Author */}
                <div className="flex items-center gap-2.5">
                  <UserProfileQuickView
                    identityKey={authorIdentityKey}
                    displayName={post.author}
                    trigger={
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white shadow-sm">
                        {authorInitial}
                      </div>
                    }
                  />
                  <UserProfileQuickView
                    identityKey={authorIdentityKey}
                    displayName={post.author}
                    trigger={<span className="text-sm font-semibold text-slate-800 hover:underline">{post.author}</span>}
                  />
                </div>

                <span className="h-4 w-px bg-slate-200" aria-hidden />

                <time className="text-sm text-slate-500" dateTime={post.created_at}>
                  {formatDate(post.created_at)}
                </time>

                <span className="text-slate-300 select-none" aria-hidden>•</span>

                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  {/* Clock icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {readingTimeMinutes} min read
                </span>

                <span className="text-slate-300 select-none" aria-hidden>•</span>

                <ViewCount slug={post.slug} initialCount={post.view_count} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <BookmarkButton slug={post.slug} title={post.title} excerpt={post.excerpt} />
                <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
                <DownvoteButton slug={post.slug} initialCount={post.downvote_count} />
                <div className="w-full sm:ml-auto sm:w-auto flex items-center justify-end">
                  <ShareButtons
                    title={post.title}
                    slug={post.slug}
                    excerpt={post.excerpt}
                    content={mainContent}
                    tags={post.tags}
                    category={post.category}
                  />
                </div>
              </div>
            </header>

            {/* ── Cover image ── */}
            <div
              className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm"
            >
              <CoverImage
                src={imageUrl}
                slug={post.slug}
                alt={post.title}
                category={post.category}
                tags={post.tags}
                disablePlaceholderFallback
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 760px"
                priority
              />
            </div>

            {/* ── Tags ── */}
            {post.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Link
                    key={`${post.id}-detail-${tag}`}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 hover:text-app dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* ── Revision trust strip ── */}
            <div className="mb-5 space-y-2">
              {approvedRevisionCount > 0 && (
                <div className="flex flex-wrap items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-emerald-600" aria-hidden>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[12px] font-bold text-emerald-800">Community Reviewed</span>
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">✓ Verified</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      Verified by Expert contributor
                      {lastReviewer && <span className="font-medium"> · {lastReviewer}</span>}
                      {lastReviewedAt && <span className="opacity-70"> · Updated {relativeDate(lastReviewedAt)}</span>}
                    </p>
                  </div>
                  <Link
                    href={`/blog/${post.slug}/revisions`}
                    className="flex-shrink-0 text-[11px] font-medium text-emerald-600 hover:underline"
                  >
                    {approvedRevisionCount} revision{approvedRevisionCount !== 1 ? "s" : ""}
                  </Link>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {approvedRevisionCount === 0 && (
                  <Link
                    href={`/blog/${post.slug}/revisions`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="12 8 12 12 14 14" /><circle cx="12" cy="12" r="10" />
                    </svg>
                    Edit history
                  </Link>
                )}
                <Link
                  href={`/blog/${post.slug}/suggest-edit`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Suggest an edit
                </Link>
              </div>
            </div>

            {/* ── Article body ── */}
            <div className="prose prose-base sm:prose-lg max-w-none prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-[1.8] sm:prose-p:leading-[1.85] prose-a:text-sky-700 prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-slate-800 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-slate-950 prose-pre:p-4 sm:prose-pre:p-5 prose-pre:text-slate-100 prose-blockquote:not-italic prose-blockquote:border-l-4 prose-blockquote:border-sky-300 prose-blockquote:bg-sky-50/60 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:text-slate-700 prose-img:rounded-xl prose-img:shadow-md prose-table:text-sm prose-th:bg-subtle prose-thead:border-app prose-tr:border-slate-100">
              <MarkdownRenderer content={mainContent} />
            </div>

            <ReadingTracker slug={post.slug} readingTimeMinutes={readingTimeMinutes} tags={post.tags} category={post.category} />
            <AiAssistant slug={post.slug} />
            <KnowledgeEcosystemPanel
              topicLabel={post.category}
              confidence="high"
              freshnessLabel={`Updated ${formatDate(post.created_at)}`}
              askAiHref={`/blog/${post.slug}`}
              nextLearn={relatedTutorials.slice(0, 4).map((tutorial) => ({
                title: tutorial.title,
                href: `/tutorials/${tutorial.slug}`,
                subtitle: tutorial.excerpt,
                reason: tutorial.difficulty ? `Next ${tutorial.difficulty}` : "Next learn",
              }))}
              relatedDiscussions={relatedForumPosts.slice(0, 4).map((thread) => ({
                title: thread.title,
                href: `/forums/${thread.slug}`,
                subtitle: `${thread.comment_count} replies`,
                reason: "Related discussion",
              }))}
              relatedShorts={relatedShorts.slice(0, 4).map((video) => ({
                title: video.title,
                href: `/shorts/${video.slug}`,
                subtitle: video.summary,
                reason: "Quick explainer",
              }))}
              topicHubs={(post.tags ?? []).slice(0, 3).map((tag) => ({
                title: `Topic hub: ${tag}`,
                href: `/tags/${encodeURIComponent(tag)}`,
                subtitle: "Blogs, tutorials, forums, and shorts",
                reason: "Knowledge hub",
              }))}
            />

            {/* ── Related Discussions ── */}
            {relatedForumPosts.length > 0 && (
              <section aria-labelledby="related-discussions-heading" className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                <h2 id="related-discussions-heading" className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-indigo-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Related Discussions
                </h2>
                <ul className="space-y-3">
                  {relatedForumPosts.map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/forums/${thread.slug}`}
                        className="group flex items-start gap-3 rounded-xl border border-indigo-100 bg-surface px-4 py-3 transition hover:border-indigo-300 hover:shadow-sm"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-indigo-400" aria-hidden>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug text-slate-800 transition group-hover:text-indigo-700 line-clamp-2">
                            {thread.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {thread.comment_count} {thread.comment_count === 1 ? "reply" : "replies"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Action bar (bottom) ── */}
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-app bg-surface px-4 py-4 sm:px-5">
              <div className="mr-1">
                <p className="text-sm font-semibold text-app">Was this helpful?</p>
                <p className="text-xs text-muted">Let us know what you think</p>
              </div>
              <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
              <DownvoteButton slug={post.slug} initialCount={post.downvote_count} />
              <div className="w-full sm:ml-auto sm:w-auto flex items-center justify-end">
                <ShareButtons
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  content={mainContent}
                  tags={post.tags}
                  category={post.category}
                />
              </div>
            </div>

            {/* ── Comments ── */}
            <BlogActiveUsersStrip title="Most engaged users on this post" users={topicUsers} />
            <div className="mt-10 rounded-2xl border border-slate-100 bg-surface p-1">
              <CommentSection slug={post.slug} initialComments={comments} />
            </div>
          </article>

          {/* ── Sidebar column ── */}
          <div className="w-full lg:w-[290px] lg:flex-shrink-0 lg:self-start">
            <div>
              <BlogSidebar
                post={post}
                relatedPosts={relatedPosts}
                recommendationCandidates={semanticRecommendations}
                categories={categories}
                tocMarkdown={mainContent}
                faqs={faqs}
                references={references}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
