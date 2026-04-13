import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import { calculateReadingTime } from "@/lib/blogService";
import { BlogCard } from "./BlogCard";
import { MarkdownRenderer } from "./MarkdownRenderer";

type BlogDetailProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
};

const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));

export function BlogDetail({ post, relatedPosts }: BlogDetailProps) {
  const readingTimeMinutes = calculateReadingTime(post.content);

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <header>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {post.category}
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>{post.author}</span>
          <span aria-hidden>•</span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          <span aria-hidden>•</span>
          <span>{readingTimeMinutes} min read</span>
        </div>
      </header>

      <div className="relative my-8 aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            TatvaOps Knowledge Base
          </div>
        )}
      </div>

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

      <div className="prose prose-lg max-w-none prose-slate">
        <MarkdownRenderer content={post.content} />
      </div>

      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-100 p-7">
        <h2 className="text-2xl font-semibold text-slate-900">Get your construction estimate instantly</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Turn BOQ complexity into actionable cost estimates with TatvaOps.
        </p>
        <Link
          href="/estimate"
          className="mt-5 inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          Get your construction estimate
        </Link>
      </section>

      {relatedPosts.length > 0 && (
        <section className="mt-14">
          <Separator.Root className="mb-8 h-px w-full bg-slate-200" />
          <h2 className="mb-5 text-2xl font-semibold text-slate-900">Related posts</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {relatedPosts.map((related) => (
              <BlogCard key={related.id} post={related} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
