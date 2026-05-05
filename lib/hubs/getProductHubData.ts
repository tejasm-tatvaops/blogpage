import { brandProducts } from "@/data/brandProfileMock";
import type { BrandProduct } from "@/data/brandProfileMock";
import { getPostsByTag } from "@/lib/blogService";
import type { BlogPost } from "@/lib/blogService";
import { getRelatedForumPosts } from "@/lib/forumService";
import type { ForumPost } from "@/lib/forumService";
import { buildHubDiscussionPosts } from "@/lib/hubs/mergeHubSignals";
import type { HubData } from "@/lib/hubs/getHubData";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Tokens from the product name that help match forum/blog text (brand is often too generic alone). */
function productSearchTerms(product: BrandProduct): string[] {
  const raw = product.name.toLowerCase();
  const skip = new Set(["ultratech", "ultra", "tech", "the", "and", "for", "grade"]);
  return raw
    .split(/[\s/]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 2 && !skip.has(w));
}

function contentMentionsProduct(text: string, product: BrandProduct): boolean {
  const hay = text.toLowerCase();
  if (hay.includes(product.name.toLowerCase())) return true;
  const terms = productSearchTerms(product);
  const strong = terms.filter((t) => t.length > 4 || /\d/.test(t));
  if (strong.some((t) => hay.includes(t))) return true;
  return terms.length > 0 && terms.filter((t) => t.length > 3).some((t) => hay.includes(t));
}

function blogMatches(b: BlogPost, product: BrandProduct): boolean {
  return contentMentionsProduct(`${b.title} ${b.excerpt ?? ""}`, product);
}

function forumMatches(f: ForumPost, product: BrandProduct): boolean {
  return contentMentionsProduct(`${f.title} ${f.excerpt ?? ""} ${f.content ?? ""}`, product);
}

export type ProductHubPageData = HubData & {
  product: BrandProduct | null;
};

/**
 * Blogs + forums scoped to a catalog product listing. Fetches by category, then filters to posts
 * that mention the product name or distinctive name tokens. Never throws.
 */
export async function getProductHubData(productId: string): Promise<ProductHubPageData> {
  const id = decodeURIComponent(productId).trim();
  const product = brandProducts.find((p) => p.id === id) ?? null;
  const hubKey = product ? `product:${product.id}` : id || "product";

  if (!product) {
    return {
      product: null,
      hubKey,
      blogs: [],
      forums: [],
      discussions: [],
      displayTitle: "This product",
    };
  }

  const [blogsRaw, forumsRaw] = await Promise.all([
    safe(() => getPostsByTag(product.category, 24), [] as BlogPost[]),
    safe(() => getRelatedForumPosts([product.category], undefined, 24), [] as ForumPost[]),
  ]);

  const blogs = blogsRaw.filter((b) => blogMatches(b, product));
  const forums = forumsRaw.filter((f) => forumMatches(f, product));
  const discussions = buildHubDiscussionPosts(forums, blogs, [], []);

  return {
    product,
    hubKey,
    displayTitle: product.name,
    blogs,
    forums,
    discussions,
  };
}
