import type { BlogPost } from "@/lib/blogService";
import type { Comment } from "@/lib/commentService";
import { DiscussButton } from "@/components/forums/DiscussButton";
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

type BlogDetailProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
  categories: string[];
  comments: Comment[];
  forumSlug?: string | null;
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

export function BlogDetail({ post, relatedPosts, categories, comments, forumSlug }: BlogDetailProps) {
  const readingTimeMinutes = calculateReadingTime(post.content);
  const imageUrl = post.cover_image || "";
  const { mainContent, faqs, references } = parseContentSections(post.content);

  const authorInitial = post.author.charAt(0).toUpperCase();

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
              <h1 className="mt-4 text-[2.1rem] font-extrabold leading-[1.18] tracking-[-0.02em] text-slate-900 sm:text-5xl">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Author */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white shadow-sm">
                    {authorInitial}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{post.author}</span>
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
                <div className="ml-auto flex items-center">
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
                  <span
                    key={`${post.id}-detail-${tag}`}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Article body ── */}
            <div className="prose prose-lg max-w-none prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-[1.85] prose-a:text-sky-700 prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-slate-800 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-slate-950 prose-pre:p-5 prose-pre:text-slate-100 prose-blockquote:not-italic prose-blockquote:border-l-4 prose-blockquote:border-sky-300 prose-blockquote:bg-sky-50/60 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:text-slate-700 prose-img:rounded-xl prose-img:shadow-md prose-table:text-sm prose-th:bg-slate-50 prose-thead:border-slate-200 prose-tr:border-slate-100">
              <MarkdownRenderer content={mainContent} />
            </div>

            <ReadingTracker slug={post.slug} readingTimeMinutes={readingTimeMinutes} />
            <AiAssistant slug={post.slug} />

            {/* ── Action bar (bottom) ── */}
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="mr-1">
                <p className="text-sm font-semibold text-slate-800">Was this helpful?</p>
                <p className="text-xs text-slate-400">Let us know what you think</p>
              </div>
              <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
              <DownvoteButton slug={post.slug} initialCount={post.downvote_count} />
              <DiscussButton
                blogSlug={post.slug}
                blogTitle={post.title}
                initialForumSlug={forumSlug}
              />
              <div className="ml-auto flex items-center">
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
            <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-1">
              <CommentSection slug={post.slug} initialComments={comments} />
            </div>
          </article>

          {/* ── Sidebar column ── */}
          <div className="w-full lg:w-[290px] lg:flex-shrink-0 lg:self-start">
            <div>
              <BlogSidebar
                post={post}
                relatedPosts={relatedPosts}
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
