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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com";

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
      images: post.cover_image ? [{ url: post.cover_image, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.cover_image ? [post.cover_image] : [],
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

  const [relatedPosts, categories, comments] = await Promise.all([
    getRelatedPosts(post, 4).catch(() => [] as BlogPost[]),
    getCategories().catch(() => [] as string[]),
    getComments(post.id).catch(() => []),
  ]);

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
        categories={categories}
        comments={comments}
      />
    </>
  );
}
