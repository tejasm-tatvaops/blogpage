import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsByTag } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";
import { ForumLinkedProductCard } from "@/components/forums/ForumLinkedProductCard";
import { AIInsightsCard } from "@/components/product/AIInsightsCard";
import { deriveProductAIInsights } from "@/lib/product/aiInsights";
import {
  resolveProductBySlug,
  ProductHeader,
  ProductDiscussionList,
  ProductArticleList,
} from "@/components/product/ProductTopicHub";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

type PageProps = { params: Promise<{ productSlug: string }> };

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const product = resolveProductBySlug(productSlug);
  const name = product?.name ?? decodeURIComponent(productSlug);
  const canonicalUrl = `${SITE_URL}/products/${encodeURIComponent(productSlug)}/hub`;

  return {
    title: `Product Topic Hub | TatvaOps`,
    description: `${name} — community discussions and articles on TatvaOps.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: `Product Topic Hub | TatvaOps`,
      description: `Community insights and articles for ${name}.`,
      siteName: "TatvaOps",
    },
  };
}

export default async function ProductHubPage({ params }: PageProps) {
  const { productSlug } = await params;
  const product = resolveProductBySlug(productSlug);

  const primaryTag = product?.category ?? decodeURIComponent(productSlug);
  const fallbackTag = decodeURIComponent(productSlug);

  const [articles, forumResult, fallbackForumResult] = await Promise.all([
    getPostsByTag(primaryTag, 20).catch(() => []),
    getForumPosts({ tag: primaryTag, sort: "hot", limit: 20 }).catch(() => ({ posts: [] })),
    primaryTag !== fallbackTag
      ? getForumPosts({ tag: fallbackTag, sort: "hot", limit: 20 }).catch(() => ({ posts: [] }))
      : Promise.resolve({ posts: [] }),
  ]);

  const seenIds = new Set<string>();
  const discussions = [...(forumResult.posts ?? []), ...(fallbackForumResult.posts ?? [])].filter(
    (p) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    },
  );

  if (!product && articles.length === 0 && discussions.length === 0) notFound();

  const displayName = product?.name ?? decodeURIComponent(productSlug);
  const aiInsights = deriveProductAIInsights(discussions, displayName);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10">
      <ProductHeader
        product={product}
        productSlug={productSlug}
        discussionCount={discussions.length}
        articleCount={articles.length}
      />

      {/* Always rendered above discussions — never conditional */}
      <AIInsightsCard {...aiInsights} />

      {product ? (
        <div className="mb-10">
          <ForumLinkedProductCard
            productId={product.id}
            productName={product.name}
            productBrand={product.brand}
          />
        </div>
      ) : (
        <div className="mb-10 flex items-center justify-center rounded-2xl border border-dashed border-app p-8 text-center">
          <p className="font-sans text-[0.78rem] font-normal leading-[1.5] text-faint">
            Product details unavailable for &ldquo;{productSlug}&rdquo;.
          </p>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <ProductDiscussionList discussions={discussions} productSlug={productSlug} />
        <ProductArticleList articles={articles} productSlug={productSlug} />
      </div>
    </main>
  );
}
