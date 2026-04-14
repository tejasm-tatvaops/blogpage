import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import type { BlogPost } from "@/lib/blogService";
import type { Comment } from "@/lib/commentService";
import { calculateReadingTime } from "@/lib/blogService";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { UpvoteButton } from "./UpvoteButton";
import { ShareButtons } from "./ShareButtons";
import { CommentSection } from "./CommentSection";
import { BlogSidebar } from "./BlogSidebar";
import { ViewCount } from "./ViewCount";
import { ReadingProgressBar } from "./ReadingProgressBar";

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

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">

        {/* ── Main article column ── */}
        <article className="min-w-0 flex-1">

          {/* Category badge */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {post.category}
          </p>

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{post.author}</span>
            <span aria-hidden>•</span>
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            <span aria-hidden>•</span>
            <span>{readingTimeMinutes} min read</span>
            <span aria-hidden>•</span>
            <ViewCount slug={post.slug} initialCount={post.view_count} />
          </div>

          {/* Quora-style action bar — below meta, above cover image */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
            <Separator.Root
              orientation="vertical"
              className="hidden h-5 w-px bg-slate-200 sm:block"
              aria-hidden
            />
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
            </div>
            <Separator.Root
              orientation="vertical"
              className="hidden h-5 w-px bg-slate-200 sm:block"
              aria-hidden
            />
            <ShareButtons title={post.title} slug={post.slug} />
          </div>

          {/* Cover image */}
          <div className="relative my-7 aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
            {post.cover_image ? (
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 720px"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                TatvaOps Knowledge Base
              </div>
            )}
          </div>

          {/* Tags (above content) */}
          <div className="mb-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={`${post.id}-detail-${tag}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Article body */}
          <div className="prose prose-lg max-w-none prose-slate">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* Bottom action bar (repeat for long reads) */}
          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <UpvoteButton slug={post.slug} initialCount={post.upvote_count} />
            <Separator.Root
              orientation="vertical"
              className="hidden h-5 w-px bg-slate-200 sm:block"
              aria-hidden
            />
            <ShareButtons title={post.title} slug={post.slug} />
          </div>

          {/* Comments */}
          <CommentSection slug={post.slug} initialComments={comments} />
        </article>

        {/* ── Sidebar column ──
             Outer div: self-start stops the flex item from stretching to article height.
             Inner div: sticky top-24 is then unambiguous — it lives inside a naturally-
             sized container and sticks relative to the viewport scroll. */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 lg:self-start">
          <div className="lg:sticky lg:top-24">
            <BlogSidebar post={post} relatedPosts={relatedPosts} categories={categories} />
          </div>
        </div>

      </div>
      </div>
    </>
  );
}
