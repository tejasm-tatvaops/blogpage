import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetail } from "@/components/blog/BlogDetail";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, extractFaqItems } from "@/lib/blogSeo";
import {
  type BlogPost,
  getAllPosts,
  getCategories,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/blogService";
import { getComments } from "@/lib/commentService";
import { getForumPostByBlogSlug, getRelatedForumPosts, type ForumPost } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getVideosByTags } from "@/lib/videoService";
import { getActiveUsersByTopic } from "@/lib/userProfileService";
import { rankSemanticBlogRecommendations } from "@/lib/semanticRecommendations";
import { getSystemToggles } from "@/lib/systemToggles";
import { getRevisionsForBlog } from "@/lib/revisionService";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com";

const toAbsoluteUrl = (value: string): string => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const posts = await getAllPosts({ limit: 1000 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  let post = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }

  if (!post) {
    return {
      title: "Post not found | TatvaOps Blog",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const socialImageUrl = post.cover_image ? toAbsoluteUrl(post.cover_image) : undefined;

  return {
    title: `${post.title} | TatvaOps Blog`,
    description: post.excerpt,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: post.title,
      description: post.excerpt,
      siteName: "TatvaOps",
      publishedTime: post.created_at,
      authors: [post.author],
      images: socialImageUrl ? [{ url: socialImageUrl, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: socialImageUrl ? [socialImageUrl] : [],
      site: "@tatvaops",
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  let post: BlogPost | null = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }

  if (!post) notFound();

  // Fetch the linked forum post first so its slug can be excluded from related forum posts.
  const forumPost = await getForumPostByBlogSlug(post.slug).catch(() => null);

  const [relatedPosts, categories, comments, topicUsers, relatedForumPosts, semanticCandidatePosts, tutorialResult, relatedShorts, blogRevisions] = await Promise.all([
    getRelatedPosts(post, 4).catch(() => [] as BlogPost[]),
    getCategories().catch(() => [] as string[]),
    getComments(post.id).catch(() => []),
    getActiveUsersByTopic([post.category, ...post.tags], 8).catch(() => []),
    getRelatedForumPosts(post.tags, forumPost?.slug ?? undefined, 4).catch(() => [] as ForumPost[]),
    getAllPosts({ limit: 120 }).catch(() => [] as BlogPost[]),
    getTutorials({ tag: post.tags[0] ?? null, limit: 4, includeUnpublished: false }).catch(() => ({ tutorials: [] })),
    getVideosByTags(post.tags, 4).catch(() => []),
    getRevisionsForBlog(post.slug, 20).catch(() => []),
  ]);
  const approvedRevisions = (blogRevisions as Array<{ status: string; reviewer_display_name?: string | null; reviewed_at?: Date | null }>).filter((r) => r.status === "approved");
  const approvedRevisionCount = approvedRevisions.length;
  const lastReviewer = approvedRevisions[0]?.reviewer_display_name ?? null;
  const lastReviewedAt = approvedRevisions[0]?.reviewed_at ? new Date(approvedRevisions[0].reviewed_at).toISOString() : null;
  const recommendationToggles = getSystemToggles();
  const semanticRecommendations = recommendationToggles.semanticRecommendationsEnabled
    ? await rankSemanticBlogRecommendations(post, semanticCandidatePosts, 6, {
        behavioralBoostEnabled: recommendationToggles.behavioralBoostEnabled,
        recommendationDiversityEnabled: recommendationToggles.recommendationDiversityEnabled,
        recommendationFreshnessEnabled: recommendationToggles.recommendationFreshnessEnabled,
        requestId: `blog:${post.slug}`,
      })
    : [];

  const faqItems = extractFaqItems(post.content);
  const articleJsonLd = buildArticleJsonLd(post, SITE_URL);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(post, SITE_URL);
  const faqJsonLd = faqItems.length > 0 ? buildFaqJsonLd(faqItems) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <BlogDetail
        post={post}
        relatedPosts={relatedPosts}
        semanticRecommendations={semanticRecommendations}
        categories={categories}
        comments={comments}
        forumSlug={forumPost?.slug ?? null}
        topicUsers={topicUsers}
        relatedForumPosts={relatedForumPosts}
        approvedRevisionCount={approvedRevisionCount}
        lastReviewer={lastReviewer ?? undefined}
        lastReviewedAt={lastReviewedAt ?? undefined}
        relatedTutorials={(tutorialResult.tutorials as Array<{ slug: string; title: string; excerpt: string; difficulty?: string }>).map((t) => ({
          slug: t.slug,
          title: t.title,
          excerpt: t.excerpt,
          difficulty: t.difficulty,
        }))}
        relatedShorts={relatedShorts.map((item) => ({
          slug: item.slug,
          title: item.title,
          summary: item.summary ?? item.shortCaption,
        }))}
      />
    </>
  );
}
