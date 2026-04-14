import * as Separator from "@radix-ui/react-separator";
import type { BlogPost } from "@/lib/blogService";
import type { Comment } from "@/lib/commentService";
import { calculateReadingTime } from "@/lib/blogService";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { UpvoteButton } from "./UpvoteButton";
import { DownvoteButton } from "./DownvoteButton";
import { ShareButtons } from "./ShareButtons";
import { CommentSection } from "./CommentSection";
import { BlogSidebar } from "./BlogSidebar";
import { ViewCount } from "./ViewCount";
import { ReadingProgressBar } from "./ReadingProgressBar";
import { buildCoverImageUrl } from "@/lib/coverImage";
import { CoverImage } from "./CoverImage";

type BlogDetailProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
  categories: string[];
  comments: Comment[];
};

const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));

export function BlogDetail({ post, relatedPosts, categories, comments }: BlogDetailProps) {
  const readingTimeMinutes = calculateReadingTime(post.content);
  const imageUrl =
    post.cover_image || buildCoverImageUrl({ title: post.title, category: post.category, tags: post.tags });

  const authorInitial = post.author.charAt(0).toUpperCase();

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            </header>

            {/* ── Action bar (top) ── */}
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
              <DownvoteButton slug={post.slug} initialCount={post.downvote_count} />
              <Separator.Root
                orientation="vertical"
                className="hidden h-5 w-px bg-slate-200 sm:block"
                aria-hidden
              />
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
              </div>
              <div className="ml-auto flex items-center">
                <ShareButtons title={post.title} slug={post.slug} />
              </div>
            </div>

            {/* ── Cover image ── */}
            <div
              className="relative mb-6 w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm"
              style={{ aspectRatio: "2 / 1" }}
            >
              <CoverImage
                src={imageUrl}
                alt={post.title}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 760px"
                priority
                fallbackLabel={post.title}
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
              <MarkdownRenderer content={post.content} />
            </div>

            {/* ── Action bar (bottom) ── */}
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="mr-1">
                <p className="text-sm font-semibold text-slate-800">Was this helpful?</p>
                <p className="text-xs text-slate-400">Let us know what you think</p>
              </div>
              <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
              <DownvoteButton slug={post.slug} initialCount={post.downvote_count} />
              <div className="ml-auto flex items-center">
                <ShareButtons title={post.title} slug={post.slug} />
              </div>
            </div>

            {/* ── Comments ── */}
            <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-1">
              <CommentSection slug={post.slug} initialComments={comments} />
            </div>
          </article>

          {/* ── Sidebar column ──
               Outer div: self-start stops the flex item from stretching to article height.
               Inner div: sticky top-24 is then unambiguous. */}
          <div className="w-full lg:w-[290px] lg:flex-shrink-0 lg:self-start">
            <div className="lg:sticky lg:top-24">
              <BlogSidebar post={post} relatedPosts={relatedPosts} categories={categories} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
