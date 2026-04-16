import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { createPost, getPostBySlug } from "@/lib/blogService";
import { generateBlogFromKeyword } from "@/lib/aiBlogGenerator";
import { readJsonBody } from "@/lib/adminApi";
import {
  appendInternalLinks,
  buildGenerationPromptKeyword,
  getAllSeedLocations,
  locationSlugHint,
  sleep,
} from "@/lib/seoGenerator";
import { bulkGenerateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

type BulkPayload = {
  locations?: string[];
  batchSize?: number;
  delayMs?: number;
  count?: number;
  random?: boolean;
};

const pickRandom = <T>(items: T[], count: number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, count));
};

export const maxDuration = 300;

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getRateLimitKey(request);
  const rl = bulkGenerateLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await readJsonBody<BulkPayload>(request);

    const requestedLocations = Array.isArray(body.locations) ? body.locations : [];
    const targetCount = Math.max(1, Math.min(body.count ?? 3, 20));
    const randomize = body.random ?? true;
    const baseLocations =
      requestedLocations.length > 0 ? requestedLocations : getAllSeedLocations();
    const cleanedLocations = baseLocations
      .map((value) => String(value).trim())
      .filter(Boolean)
      .slice(0, 100);
    const locations =
      requestedLocations.length > 0
        ? cleanedLocations.slice(0, targetCount)
        : randomize
          ? pickRandom(cleanedLocations, targetCount)
          : cleanedLocations.slice(0, targetCount);

    const batchSize = Math.max(1, Math.min(body.batchSize ?? 3, 8));
    const delayMs = Math.max(200, Math.min(body.delayMs ?? 900, 3000));

    const created: Array<{ id: string; slug: string; location: string }> = [];
    const skipped: Array<{ location: string; reason: string }> = [];
    const failed: Array<{ location: string; reason: string }> = [];
    const knownSlugs: string[] = [];

    logger.info({ totalLocations: locations.length, batchSize, delayMs }, "Admin blog generation started");

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);

      for (let index = 0; index < batch.length; index += 1) {
        const location = batch[index];
        const absoluteIndex = i + index;
        const keyword = buildGenerationPromptKeyword(location, absoluteIndex);

        try {
          const suggestedSlug = `construction-cost-${locationSlugHint(location)}`;
          const existing = await getPostBySlug(suggestedSlug, true);
          if (existing) {
            skipped.push({ location, reason: `Slug already exists: ${existing.slug}` });
            knownSlugs.push(existing.slug);
            continue;
          }

          const generated = await generateBlogFromKeyword(keyword, [
            "/blog",
            ...knownSlugs.slice(0, 3).map((slug) => `/blog/${slug}`),
          ]);

          const slugToCheck = generated.slug || suggestedSlug;
          const duplicate = await getPostBySlug(slugToCheck, true);
          if (duplicate) {
            skipped.push({ location, reason: `Generated duplicate slug: ${slugToCheck}` });
            knownSlugs.push(duplicate.slug);
            continue;
          }

          const post = await createPost({
            title: generated.title,
            slug: slugToCheck,
            excerpt: generated.excerpt,
            content: appendInternalLinks(generated.content, location, knownSlugs),
            cover_image: generated.cover_image,
            author: "TatvaOps AI",
            tags: (generated.tags ?? []).slice(0, 10),
            category: generated.category || "Programmatic SEO",
            published: true,
          });

          created.push({ id: post.id, slug: post.slug, location });
          knownSlugs.push(post.slug);
          logger.info({ slug: post.slug, location }, "Admin bulk post created");
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown generation failure.";
          logger.error({ location, error }, "Admin bulk generation item failed");
          failed.push({ location, reason });
        }

        await sleep(delayMs);
      }
    }

    return NextResponse.json(
      {
        totalRequested: locations.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        created,
        skipped,
        failed,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ error }, "Admin bulk generation route error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk generation failed." },
      { status: 500 },
    );
  }
}
