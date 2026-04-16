import mongoose from "mongoose";
import { connectToDatabase } from "../lib/mongodb";
import { BlogModel } from "../models/Blog";
import { generateBlogCoverImage } from "../lib/imageService";
import { persistBlogCoverImage } from "../lib/imageStorage";

type BlogLite = {
  _id: { toString(): string };
  title?: string;
  slug?: string;
  tags?: string[];
  category?: string;
  cover_image?: string | null;
};

const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 2;
const DEFAULT_FALLBACK_IMAGE = "/images/blog-placeholder.svg";
const SECONDARY_FALLBACK_IMAGE = "/images/blog-default.svg";
const MIN_ACCEPTABLE_SCORE = 2;
const LOCAL_LIBRARY_BY_CATEGORY: Record<string, string[]> = {
  construction: [
    "/api/cover-image?title=Residential%20Construction%20Project&category=Construction&tags=residential,site,materials",
    "/api/cover-image?title=Commercial%20Build%20Progress&category=Construction&tags=commercial,crane,project",
    "/api/cover-image?title=Modern%20House%20Construction&category=Construction&tags=house,villa,site",
  ],
  "real estate": [
    "/api/cover-image?title=Real%20Estate%20Development%20Site&category=Real%20Estate&tags=real-estate,building,development",
    "/api/cover-image?title=Property%20Construction%20Progress&category=Real%20Estate&tags=property,project,urban",
  ],
  infrastructure: [
    "/api/cover-image?title=Infrastructure%20Execution%20Plan&category=Infrastructure&tags=concrete,steel,urban",
    "/api/cover-image?title=Urban%20Infrastructure%20Site&category=Infrastructure&tags=roads,materials,workers",
  ],
  default: ["/images/blog-default.svg"],
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeImageKey = (value: string): string =>
  value.trim().replace(/([?&])(sig|utm_[^=]+)=[^&]*/g, "").replace(/[?&]$/, "");

const toHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const isNilOrEmpty = (value: string | null | undefined): boolean =>
  value == null || value.trim() === "";

const isValidStoredImage = (value: string | null | undefined): boolean => {
  if (isNilOrEmpty(value)) return false;
  const v = String(value).trim();
  // Explicitly supported sources:
  if (v.startsWith("/uploads/")) return true;
  if (v.startsWith("/images/")) return true;
  if (v.startsWith("/api/cover-image")) return true;
  if (v.startsWith("data:image/")) return true;
  if (v.startsWith("https://")) return true;
  // Reject only null/undefined/empty by policy.
  return true;
};

const isBadImage = (value: string | null | undefined): boolean => {
  if (isNilOrEmpty(value)) return true;
  const v = String(value).trim().toLowerCase();

  // Explicit bad markers
  if (v.includes("placeholder")) return true;
  if (v.includes("gradient")) return true;
  if (v.includes("dummy")) return true;
  if (v.includes("blog-placeholder")) return true;
  if (v.includes("/images/blog-placeholder.svg")) return true;

  // Treat data URLs as low-quality/temporary for bulk upgrade.
  if (v.startsWith("data:image/")) return true;

  // Optional generic heuristics.
  if (v.includes("picsum.photos")) return true;
  if (v.includes("source.unsplash.com")) return true;

  return false;
};

const isGoodImage = (value: string | null | undefined): boolean => {
  if (!isValidStoredImage(value)) return false;
  if (isBadImage(value)) return false;
  return true;
};

const scoreImage = (
  url: string | null | undefined,
  blog: { category?: string; tags?: string[] },
  usageCounts: Map<string, number>,
): number => {
  if (isNilOrEmpty(url)) return 0;
  const value = String(url).trim().toLowerCase();
  let score = 0;

  // Penalize placeholders / low quality markers.
  if (value.includes("placeholder")) score -= 5;
  if (value.includes("gradient")) score -= 3;
  if (value.includes("dummy")) score -= 3;
  if (value.includes("blog-placeholder")) score -= 4;

  // Penalize obviously reused-tagged urls if present.
  if (value.includes("reused")) score -= 2;

  // Prefer real remote sources.
  if (value.startsWith("http://") || value.startsWith("https://")) score += 2;

  // Prefer topic/category/tag match.
  const category = String(blog.category ?? "").trim().toLowerCase();
  if (category && value.includes(category)) score += 2;
  const tags = Array.isArray(blog.tags) ? blog.tags : [];
  if (tags.some((tag) => value.includes(String(tag).toLowerCase()))) score += 1;

  // Prefer diversity: penalize frequently used images.
  const normalized = normalizeImageKey(value);
  const usage = usageCounts.get(normalized) ?? 0;
  if (usage <= 1) score += 2;
  else if (usage <= 3) score += 1;
  else score -= 2;

  return score;
};

const withRetriesNoThrow = async <T>(
  fn: () => Promise<T>,
  retries: number,
  label: string,
): Promise<T | null> => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[retry] ${label} attempt ${attempt + 1}/${retries + 1} failed: ${message}`);
      if (attempt === retries) return null;
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
};

const normalizeBlog = (blog: BlogLite): {
  id: string;
  title: string;
  category: string;
  tags: string[];
  slug: string;
} => ({
  id: blog._id.toString(),
  title: String(blog.title ?? "").trim() || "Construction blog",
  category: String(blog.category ?? "").trim() || "Construction / Real Estate",
  tags: Array.isArray(blog.tags) ? blog.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  slug: String(blog.slug ?? "").trim(),
});

const tryReuse = async (
  blog: { title: string; category: string; tags: string[] },
  usedImages: Set<string>,
): Promise<{ image: string | null; duplicateSkipped: boolean }> => {
  try {
    const candidates = (await BlogModel.find({
      deleted_at: null,
      cover_image: { $nin: [null, ""] },
      $or: [{ category: blog.category }, { tags: { $in: blog.tags } }],
    })
      .select("cover_image")
      .sort({ updated_at: -1, created_at: -1 })
      .limit(50)
      .lean()) as unknown as Array<{ cover_image?: string | null }>;

    const reused = candidates
      .map((item) => String(item.cover_image ?? "").trim())
      .find((img) => {
        if (!isValidStoredImage(img)) return false;
        const normalized = normalizeImageKey(img);
        return !usedImages.has(normalized);
      });

    if (!reused) {
      const hadValid = candidates.some((item) => isValidStoredImage(item.cover_image ?? null));
      return { image: null, duplicateSkipped: hadValid };
    }
    return {
      image: (await persistBlogCoverImage({ image: reused, slugHint: blog.title })) || reused,
      duplicateSkipped: false,
    };
  } catch (error) {
    console.warn(
      `[resolveImage] reuse failed for "${blog.title}": ${error instanceof Error ? error.message : "unknown"}`,
    );
    return { image: null, duplicateSkipped: false };
  }
};

const tryGenerate = async (blog: {
  title: string;
  category: string;
  tags: string[];
}): Promise<string | null> => {
  const generated = await withRetriesNoThrow(
    () =>
      generateBlogCoverImage({
        title: blog.title,
        category: blog.category,
        tags: blog.tags,
      }),
    MAX_RETRIES,
    `generate:${blog.title}`,
  );
  if (!isValidStoredImage(generated)) return null;
  const generatedImage = String(generated);
  const persisted = await withRetriesNoThrow(
    () => persistBlogCoverImage({ image: generatedImage, slugHint: blog.title }),
    MAX_RETRIES,
    `persist:${blog.title}`,
  );
  return isValidStoredImage(persisted) ? persisted : generatedImage;
};

const getCategoryBucket = (category: string): string[] => {
  const normalized = category.toLowerCase();
  if (normalized.includes("construction")) return LOCAL_LIBRARY_BY_CATEGORY.construction;
  if (normalized.includes("real estate")) return LOCAL_LIBRARY_BY_CATEGORY["real estate"];
  if (normalized.includes("infrastructure")) return LOCAL_LIBRARY_BY_CATEGORY.infrastructure;
  return LOCAL_LIBRARY_BY_CATEGORY.default;
};

const getLocalLibraryImage = (
  blog: { title: string; category: string; tags: string[]; slug?: string },
  usedImages: Set<string>,
): string | null => {
  const pool = getCategoryBucket(blog.category);
  if (pool.length === 0) return null;

  const key = `${blog.slug || blog.title} ${blog.category} ${blog.tags.join(" ")}`.toLowerCase();
  const startIndex = toHash(key) % pool.length;
  for (let step = 0; step < pool.length; step += 1) {
    const candidate = pool[(startIndex + step) % pool.length];
    const normalized = normalizeImageKey(candidate);
    if (!usedImages.has(normalized)) return candidate;
  }
  // No unique local image currently available in the selected category pool.
  return null;
};

async function resolveImage(
  blog: { title: string; category: string; tags: string[]; slug?: string },
  usedImages: Set<string>,
): Promise<{
  image: string;
  source: "reused" | "generated" | "library" | "fallback";
  uniquenessNote?: "unique" | "duplicate_skipped";
}> {
  let image: string | null = null;
  let duplicateSkipped = false;

  const reuseResult = await tryReuse(blog, usedImages);
  image = reuseResult.image;
  duplicateSkipped = reuseResult.duplicateSkipped;
  if (isValidStoredImage(image)) {
    return {
      image: String(image),
      source: "reused",
      uniquenessNote: "unique",
    };
  }

  image = getLocalLibraryImage(blog, usedImages);
  if (isValidStoredImage(image)) {
    return {
      image: String(image),
      source: "library",
      ...(duplicateSkipped ? { uniquenessNote: "duplicate_skipped" as const } : {}),
    };
  }

  // External generation as last resort only.
  image = await tryGenerate(blog);
  if (isValidStoredImage(image)) {
    return {
      image: String(image),
      source: "generated",
      ...(duplicateSkipped ? { uniquenessNote: "duplicate_skipped" as const } : {}),
    };
  }

  return {
    image: SECONDARY_FALLBACK_IMAGE || DEFAULT_FALLBACK_IMAGE,
    source: "fallback",
    ...(duplicateSkipped ? { uniquenessNote: "duplicate_skipped" as const } : {}),
  };
}

const run = async (): Promise<void> => {
  await connectToDatabase();

  const blogs = (await BlogModel.find({ deleted_at: null })
    .select("_id title slug tags category cover_image")
    .lean()) as unknown as BlogLite[];
  const usedImages = new Set(
    blogs
      .map((blog) => String(blog.cover_image ?? "").trim())
      .filter((image) => isGoodImage(image))
      .map((image) => normalizeImageKey(image)),
  );
  const usageCounts = blogs.reduce((map, blog) => {
    const value = String(blog.cover_image ?? "").trim();
    if (!isValidStoredImage(value)) return map;
    const key = normalizeImageKey(value);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const summary = {
    total: blogs.length,
    success: 0,
    failed: 0,
    skipped: 0,
    replaced: 0,
    reused: 0,
    generated: 0,
    library: 0,
    fallback: 0,
  };

  let cursor = 0;

  const worker = async (workerId: number): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= blogs.length) return;

      const blog = blogs[index];
      const normalized = normalizeBlog(blog);
      const id = normalized.id;

      try {
        const currentScore = scoreImage(blog.cover_image, normalized, usageCounts);
        if (currentScore >= MIN_ACCEPTABLE_SCORE) {
          summary.skipped += 1;
          console.info(
            `[worker:${workerId}] skipped ${id} (score=${currentScore} >= threshold=${MIN_ACCEPTABLE_SCORE})`,
          );
          continue;
        }

        const resolved = await resolveImage(normalized, usedImages);
        const finalImage = isValidStoredImage(resolved.image) ? resolved.image : DEFAULT_FALLBACK_IMAGE;
        const finalImageKey = normalizeImageKey(finalImage);

        await BlogModel.updateOne(
          { _id: blog._id },
          {
            $set: {
              cover_image: finalImage,
            },
          },
        );

        summary.success += 1;
        summary.replaced += 1;
        summary[resolved.source] += 1;
        usedImages.add(finalImageKey);
        usageCounts.set(finalImageKey, (usageCounts.get(finalImageKey) ?? 0) + 1);
        const uniquenessSuffix =
          resolved.source === "reused"
            ? " (reused:unique)"
            : resolved.uniquenessNote === "duplicate_skipped"
              ? " (reused:duplicate skipped)"
              : "";
        console.info(
          `[worker:${workerId}] replaced ${id} (score=${currentScore} < threshold=${MIN_ACCEPTABLE_SCORE}) -> source=${resolved.source}${uniquenessSuffix}`,
        );
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[worker:${workerId}] failed ${id}: ${message}`);
      }
    }
  };

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, Math.max(1, blogs.length)) }, (_, i) =>
    worker(i + 1),
  );

  await Promise.all(workers);

  console.info("\n=== Image Generation Summary ===");
  console.info(`Total   : ${summary.total}`);
  console.info(`Success : ${summary.success}`);
  console.info(`Failed  : ${summary.failed}`);
  console.info(`Skipped : ${summary.skipped}`);
  console.info(`Replaced: ${summary.replaced}`);
  console.info(`Reused  : ${summary.reused}`);
  console.info(`Generated: ${summary.generated}`);
  console.info(`Library : ${summary.library}`);
  console.info(`Fallback: ${summary.fallback}`);
  console.info("================================\n");

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("[generate:images] Fatal:", error);
  await mongoose.connection.close();
  process.exit(1);
});
