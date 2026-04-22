import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ForumVoteBar } from "@/components/forums/ForumVoteBar";
import { ForumCommentSection } from "@/components/forums/ForumCommentSection";
import { ForumViewCount } from "@/components/forums/ForumViewCount";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { getForumPostBySlug, getForumPosts } from "@/lib/forumService";
import { getPostsByTag } from "@/lib/blogService";
import { getComments } from "@/lib/commentService";
import { getActiveUsersByTopic } from "@/lib/userProfileService";
import { TopicActiveUsersStrip } from "@/components/users/TopicActiveUsersStrip";
import { buildForumPostJsonLd, buildForumBreadcrumbJsonLd } from "@/lib/forumSeo";
import { generateSEO } from "@/lib/seo";
import { getTutorials } from "@/lib/tutorialService";
import { getVideosByTags } from "@/lib/videoService";
import { KnowledgeEcosystemPanel } from "@/components/knowledge/KnowledgeEcosystemPanel";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const { posts } = await getForumPosts({ sort: "new", limit: 50, page: 1 });
    return posts.map((p: { slug: string }) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let post = null;
  try {
    post = await getForumPostBySlug(decodeURIComponent(slug));
  } catch {
    post = null;
  }

  if (!post) {
    return { title: "Thread not found | TatvaOps Forums", robots: { index: false, follow: false } };
  }

  return generateSEO({
    title: `${post.title} | TatvaOps Forums`,
    description: post.excerpt,
    keywords: post.tags,
    url: `${SITE_URL}/forums/${post.slug}`,
    type: "article",
    publishedTime: post.created_at,
    modifiedTime: post.updated_at,
    authors: [post.author_name],
    tags: post.tags,
  });
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

  const primaryTag = post.tags[0] ?? "";

  const [comments, topicUsers, relatedBlogs, relatedTutorials, relatedShorts] = await Promise.all([
    getComments(post.id),
    getActiveUsersByTopic([...post.tags, post.title], 8).catch(() => []),
    primaryTag ? getPostsByTag(primaryTag, 4).catch(() => []) : Promise.resolve([]),
    getTutorials({ tag: primaryTag || null, limit: 4, includeUnpublished: false }).then((result) => result.tutorials).catch(() => []),
    getVideosByTags(post.tags, 4).catch(() => []),
  ]);

  const postJsonLd = buildForumPostJsonLd(post, SITE_URL);
  const breadcrumbJsonLd = buildForumBreadcrumbJsonLd(post, SITE_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/forums" className="transition hover:text-app">
            Forums
          </Link>
          {post.tags[0] && (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/forums?tag=${encodeURIComponent(post.tags[0])}`}
                className="transition hover:text-app"
              >
                #{post.tags[0]}
              </Link>
            </>
          )}
          <span aria-hidden>/</span>
          <span className="line-clamp-1 text-slate-700">{post.title}</span>
        </nav>

        {/* Blog backlink */}
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
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-700 dark:hover:bg-slate-700"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="mb-3 text-3xl font-extrabold leading-tight text-app">{post.title}</h1>

        {/* Meta */}
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{post.author_name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {post.author_reputation_tier}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            🧠 {Math.round((post.quality_score ?? 0) * 100)}%
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            🔥 {Math.round((post.engagement_score ?? 0) * 100)}%
          </span>
          <span aria-hidden>·</span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          <span aria-hidden>·</span>
          <ForumViewCount slug={post.slug} initialCount={post.view_count} />
        </div>

        {post.badges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {badge === "Top Thinker"
                  ? "🧠 Top Thinker"
                  : badge === "Hot Contributor"
                    ? "🔥 Hot Contributor"
                    : "💬 Discussion Starter"}
              </span>
            ))}
          </div>
        )}

        {/* Engagement bar */}
        <div className="-mx-4 mb-8 border-y border-app bg-surface px-4 py-3">
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

        {/* Related Articles */}
        {relatedBlogs.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="mt-10 rounded-2xl border border-app bg-subtle p-5">
            <h2 id="related-articles-heading" className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-app">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Related Articles
            </h2>
            <ul className="space-y-3">
              {relatedBlogs.map((blog) => (
                <li key={blog.id}>
                  <Link
                    href={`/blog/${blog.slug}`}
                    className="group flex items-start gap-3 rounded-xl border border-app bg-surface px-4 py-3 transition hover:border-sky-300 hover:shadow-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-sky-400" aria-hidden>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-app transition group-hover:text-sky-700 line-clamp-2">
                        {blog.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted line-clamp-1">{blog.excerpt}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <KnowledgeEcosystemPanel
          topicLabel={primaryTag || "this discussion"}
          confidence="medium"
          freshnessLabel="Community + editorial signals"
          askAiHref={post.linked_blog_slug ? `/blog/${post.linked_blog_slug}` : "/ask"}
          nextLearn={(relatedTutorials as Array<{ slug: string; title: string; excerpt: string; difficulty?: string }>).slice(0, 4).map((tutorial) => ({
            title: tutorial.title,
            href: `/tutorials/${tutorial.slug}`,
            subtitle: tutorial.excerpt,
            reason: tutorial.difficulty ? `Level ${tutorial.difficulty}` : "Next learn",
          }))}
          relatedDiscussions={[]}
          relatedShorts={relatedShorts.slice(0, 4).map((video) => ({
            title: video.title,
            href: `/shorts/${video.slug}`,
            subtitle: video.summary ?? video.shortCaption,
            reason: "Visual explainer",
          }))}
          topicHubs={post.tags.slice(0, 3).map((tag) => ({
            title: `Topic hub: ${tag}`,
            href: `/tags/${encodeURIComponent(tag)}`,
            subtitle: "Connected blogs, tutorials, and shorts",
            reason: "Hub",
          }))}
        />

        {/* Discussion */}
        <TopicActiveUsersStrip title="People active in similar threads" users={topicUsers} />
        <ForumCommentSection
          slug={post.slug}
          initialComments={comments}
          bestCommentId={post.best_comment_id}
          creatorFingerprint={post.creator_fingerprint}
        />

        {/* Footer nav */}
        <div className="mt-12 border-t border-app pt-6">
          <Link
            href="/forums"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-app"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Forums
          </Link>
        </div>
      </main>
    </>
  );
}
