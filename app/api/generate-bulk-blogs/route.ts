import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { createPost, getPostBySlug } from "@/lib/blogService";
import {
  appendInternalLinks,
  buildGenerationPromptKeyword,
  getAllSeedLocations,
  locationSlugHint,
  sleep,
} from "@/lib/seoGenerator";

type GenerateBlogResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
};

type BulkPayload = {
  locations?: string[];
  batchSize?: number;
  delayMs?: number;
};

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as BulkPayload;
    const requestedLocations = Array.isArray(body.locations) ? body.locations : [];
    const locations = (requestedLocations.length > 0 ? requestedLocations : getAllSeedLocations())
      .map((value) => String(value).trim())
      .filter(Boolean);

    const batchSize = Math.max(1, Math.min(body.batchSize ?? 3, 8));
    const delayMs = Math.max(200, Math.min(body.delayMs ?? 900, 3000));

    const created: Array<{ id: string; slug: string; location: string }> = [];
    const skipped: Array<{ location: string; reason: string }> = [];
    const failed: Array<{ location: string; reason: string }> = [];
    const knownSlugs: string[] = [];

    const apiBase = getApiBaseUrl();

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

          const response = await fetch(`${apiBase}/api/generate-blog`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword,
              internalLinks: ["/blog", "/estimate", ...knownSlugs.slice(0, 3).map((slug) => `/blog/${slug}`)],
            }),
          });

          const generated = (await response.json()) as Partial<GenerateBlogResponse> & { error?: string };
          if (!response.ok || !generated.title || !generated.content || !generated.excerpt) {
            throw new Error(generated.error || "Failed to generate blog content.");
          }

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
            cover_image: null,
            author: "TatvaOps AI",
            tags: (generated.tags ?? []).slice(0, 10),
            category: generated.category || "Programmatic SEO",
            published: true,
          });

          created.push({ id: post.id, slug: post.slug, location });
          knownSlugs.push(post.slug);
        } catch (error) {
          failed.push({
            location,
            reason: error instanceof Error ? error.message : "Unknown generation failure.",
          });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk generation failed." },
      { status: 500 },
    );
  }
}
