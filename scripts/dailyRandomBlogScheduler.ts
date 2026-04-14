import { createPost, getPostBySlug } from "../lib/blogService";
import { generateBlogFromKeyword } from "../lib/aiBlogGenerator";
import {
  appendInternalLinks,
  buildGenerationPromptKeyword,
  getAllSeedLocations,
  locationSlugHint,
  sleep,
} from "../lib/seoGenerator";

const DAILY_COUNT = 5;
const MAX_LOCATIONS = 100;

const pickRandom = <T>(items: T[], count: number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const generateSingleRandomBlog = async (): Promise<void> => {
  const allLocations = getAllSeedLocations().slice(0, MAX_LOCATIONS);
  const [location] = pickRandom(allLocations, 1);
  if (!location) return;

  const keyword = buildGenerationPromptKeyword(location, Math.floor(Math.random() * 1000));
  const suggestedSlug = `construction-cost-${locationSlugHint(location)}`;

  const existing = await getPostBySlug(suggestedSlug, true);
  if (existing) {
    console.info(`[scheduler] skipped existing slug: ${existing.slug}`);
    return;
  }

  const generated = await generateBlogFromKeyword(keyword, ["/blog"]);
  const slugToCheck = generated.slug || suggestedSlug;
  const duplicate = await getPostBySlug(slugToCheck, true);
  if (duplicate) {
    console.info(`[scheduler] skipped duplicate slug: ${slugToCheck}`);
    return;
  }

  const post = await createPost({
    title: generated.title,
    slug: slugToCheck,
    excerpt: generated.excerpt,
    content: appendInternalLinks(generated.content, location, []),
    cover_image: generated.cover_image,
    author: "TatvaOps AI",
    tags: (generated.tags ?? []).slice(0, 10),
    category: generated.category || "Programmatic SEO",
    published: true,
  });

  console.info(`[scheduler] created: ${post.slug}`);
};

const scheduleCycle = (): void => {
  const dayMs = 24 * 60 * 60 * 1000;
  const uniqueOffsets = new Set<number>();
  while (uniqueOffsets.size < DAILY_COUNT) {
    uniqueOffsets.add(Math.floor(Math.random() * dayMs));
  }
  const offsets = Array.from(uniqueOffsets).sort((a, b) => a - b);

  console.info(
    `[scheduler] scheduled ${DAILY_COUNT} random blog generation jobs in next 24h`,
  );

  for (const offset of offsets) {
    setTimeout(async () => {
      try {
        await generateSingleRandomBlog();
      } catch (error) {
        console.error("[scheduler] job failed:", error);
      }
    }, offset);
  }

  setTimeout(scheduleCycle, dayMs);
};

const run = async (): Promise<void> => {
  const enabled = process.env.DAILY_AUTO_BLOGS_ENABLED === "true";
  if (!enabled) {
    console.info(
      "[scheduler] DAILY_AUTO_BLOGS_ENABLED is not true. Exiting without scheduling.",
    );
    return;
  }

  console.info("[scheduler] starting daily random blog scheduler...");
  if (process.env.DAILY_AUTO_BLOGS_RUN_ON_START === "true") {
    await generateSingleRandomBlog();
  }
  scheduleCycle();

  while (true) {
    await sleep(60_000);
  }
};

run().catch((error) => {
  console.error("[scheduler] fatal error:", error);
  process.exit(1);
});
