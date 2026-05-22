import { brandProducts } from "@/data/brandProfileMock";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getAllForumTags } from "@/lib/forumService";
import { getAllTags } from "@/lib/blogService";
import { UserProfileModel } from "@/models/UserProfile";

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Topic hub pages at /hubs/[hubSlug] — driven by blog + forum tags. */
export async function getTopicHubSlugsForSitemap(): Promise<string[]> {
  const [blogTags, forumTags] = await Promise.all([
    getAllTags().catch(() => [] as string[]),
    getAllForumTags().catch(() => [] as string[]),
  ]);

  return [...new Set([...blogTags, ...forumTags])]
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Product listing hubs: /hubs/product/[id] and /products/[slug]/hub */
export function getProductPathsForSitemap(): string[] {
  const paths = new Set<string>();

  for (const product of brandProducts) {
    paths.add(`/hubs/product/${encodeURIComponent(product.id)}`);
    paths.add(`/products/${encodeURIComponent(product.id)}/hub`);

    const nameSlug = slugifyProductName(product.name);
    if (nameSlug && nameSlug !== product.id) {
      paths.add(`/products/${encodeURIComponent(nameSlug)}/hub`);
    }
  }

  return [...paths];
}

/** Public member profiles at /user/[identityKey] (excludes seed identities). */
export async function getPublicUserIdentityKeysForSitemap(
  limit = 3000,
): Promise<string[]> {
  await connectToDatabase();

  const docs = (await UserProfileModel.find({
    identity_key: { $not: /^seed:/ },
  })
    .select("identity_key")
    .limit(Math.min(Math.max(1, limit), 10_000))
    .lean()) as unknown as Array<{ identity_key?: string }>;

  return docs
    .map((doc) => String(doc.identity_key ?? "").trim())
    .filter(Boolean);
}
