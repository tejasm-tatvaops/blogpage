import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ForumVoteBar } from "@/components/forums/ForumVoteBar";
import { ForumCommentSection } from "@/components/forums/ForumCommentSection";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { getForumPostBySlug } from "@/lib/forumService";
import { getComments } from "@/lib/commentService";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getForumPostBySlug(decodeURIComponent(slug));
  if (!post) return { title: "Not found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${siteUrl}/forums/${post.slug}`,
      type: "article",
      publishedTime: post.created_at,
      tags: post.tags,
    },
    twitter: { card: "summary", title: post.title, description: post.excerpt },
  };
}

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export default async function ForumThreadPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getForumPostBySlug(decodeURIComponent(slug));
  if (!post) notFound();

  const comments = await getComments(post.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/forums" className="transition hover:text-slate-900">
          Forums
        </Link>
        {post.tags[0] && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/forums?tag=${encodeURIComponent(post.tags[0])}`}
              className="transition hover:text-slate-900"
            >
              #{post.tags[0]}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="line-clamp-1 text-slate-700">{post.title}</span>
      </nav>

      {/* Blog backlink — shown when this thread was created from a blog post */}
      {post.linked_blog_slug && (
        <Link
          href={`/blog/${post.linked_blog_slug}`}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Read the original article
        </Link>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/forums?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mb-3 text-3xl font-extrabold leading-tight text-slate-900">{post.title}</h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span className="font-medium text-slate-700">{post.author_name}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        <span aria-hidden>·</span>
        <span>{post.view_count.toLocaleString()} views</span>
      </div>

      {/* Engagement bar */}
      <div className="-mx-4 mb-8 border-y border-slate-200 bg-white px-4 py-3">
        <ForumVoteBar
          slug={post.slug}
          initialUpvotes={post.upvote_count}
          initialDownvotes={post.downvote_count}
          commentCount={post.comment_count}
        />
      </div>

      {/* Post content */}
      <article className="prose prose-slate max-w-none">
        <MarkdownRenderer content={post.content} />
      </article>

      {/* Per-session view tracker */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var k='fv_'+${JSON.stringify(post.slug)};if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');fetch('/api/forums/'+encodeURIComponent(${JSON.stringify(post.slug)}),{method:'POST'});}})();`,
        }}
      />

      {/* Discussion */}
      <ForumCommentSection
        slug={post.slug}
        initialComments={comments}
        bestCommentId={post.best_comment_id}
        creatorFingerprint={post.creator_fingerprint}
      />

      {/* Footer nav */}
      <div className="mt-12 border-t border-slate-200 pt-6">
        <Link
          href="/forums"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Forums
        </Link>
      </div>
    </main>
  );
}
