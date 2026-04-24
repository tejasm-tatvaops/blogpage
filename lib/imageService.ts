import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/db/mongodb";
import { BlogModel } from "@/models/Blog";
import { persistBlogCoverImage } from "@/lib/imageStorage";

export type BlogImageInput = {
  title: string;
  category?: string;
  tags?: string[];
};

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
const IMAGE_TIMEOUT_MS = 15_000;
const inFlightPromptMap = new Map<string, Promise<string | null>>();
const promptResultCache = new Map<string, { image: string; expiresAt: number }>();
const PROMPT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REUSE_SIMILARITY_THRESHOLD = 0.62;
const CURATED_CONSTRUCTION_IMAGES = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=1600&q=80",
];

const toSeed = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 2)
    .slice(0, 40);

const toTokenSet = (input: BlogImageInput): Set<string> => {
  const source = [input.title, input.category ?? "", ...(input.tags ?? [])].join(" ");
  return new Set(tokenize(source));
};

const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
};

const isBlank = (value?: string | null): boolean => !value || !value.trim();

const isValidHttpImageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.length > 3 &&
      !parsed.hostname.includes("localhost")
    );
  } catch {
    return false;
  }
};

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeout: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const toKeywords = ({ title, category, tags = [] }: BlogImageInput): string[] =>
  [title, category ?? "", ...tags]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 16);

const pickLocationPhrase = (input: BlogImageInput): string => {
  const source = [input.title, input.category, ...(input.tags ?? [])].join(" ");
  const hit =
    source.match(
      /\b(bangalore|bengaluru|mumbai|delhi|new delhi|chennai|hyderabad|pune|kolkata|ahmedabad|sarjapur|velachery|india)\b/i,
    )?.[0] ?? "";
  return hit.trim();
};

export const generateBlogImagePrompt = (blog: BlogImageInput): string => {
  const location = pickLocationPhrase(blog);
  const resolvedLocation = location || "generic urban construction setting";
  const keyTopics = toKeywords(blog).slice(0, 8).join(", ");

  return `Create a photorealistic, high-quality construction site cover photo in a wide 16:9 landscape composition.

Blog context:
- Title: ${blog.title}
- Category: Construction / Real Estate
- Location: ${resolvedLocation}

Scene requirements:
- Real construction environment with authentic details: partially built structures, residential/commercial buildings, cranes, scaffolding, workers in safety gear, concrete, steel, bricks, and active site materials.
- If location is in India (or Indian city is detected), reflect India-specific architecture and urban context (street patterns, building style, materials, climate tone) while remaining realistic and modern.
- Professional natural daylight photography look (golden hour or clean daytime), realistic shadows, depth, and textures.
- Camera style: wide-angle documentary/editorial photo, sharp focus, cinematic yet realistic framing.
- Keep image clean and uncluttered, suitable as a premium blog hero image.
- Topical emphasis: ${keyTopics || "construction and real estate project execution"}.

Strict constraints:
- No text, no logos, no watermark, no UI overlays.
- No illustration, no vector art, no 3D render look, no cartoon style.
- No gradients, abstract shapes, or placeholder-style graphics.
- Must look like real-world photography similar to Unsplash quality.`;
};

const normalizeCoverImageUrl = (url: string): string =>
  url
    .trim()
    // Normalize common cache-busting params so we can reuse better
    .replace(/([?&])(sig|ixid|ixlib|utm_[^=]+)=[^&]*/g, "")
    .replace(/[?&]$/, "");

const getReusableCoverFromExistingBlogs = async (
  input: BlogImageInput,
): Promise<string | null> => {
  await connectToDatabase();
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 10);

  const candidates = await BlogModel.find({
    deleted_at: null,
    cover_image: { $nin: [null, ""] },
    $or: [{ category: input.category ?? "" }, { tags: { $in: tags } }],
  })
    .select("title category tags cover_image")
    .sort({ updated_at: -1, created_at: -1 })
    .limit(150)
    .lean();

  if (candidates.length === 0) return null;

  const inputSet = toTokenSet(input);
  let best: { score: number; image: string } | null = null;

  for (const candidate of candidates) {
    const candidateImage = String((candidate as { cover_image?: unknown }).cover_image ?? "").trim();
    if (!candidateImage) continue;

    const candidateSet = toTokenSet({
      title: String((candidate as { title?: unknown }).title ?? ""),
      category: String((candidate as { category?: unknown }).category ?? ""),
      tags: Array.isArray((candidate as { tags?: unknown }).tags)
        ? ((candidate as { tags: unknown[] }).tags.map((t) => String(t)) as string[])
        : [],
    });

    const baseSimilarity = jaccardSimilarity(inputSet, candidateSet);
    const categoryBoost =
      (input.category ?? "").toLowerCase() ===
      String((candidate as { category?: unknown }).category ?? "").toLowerCase()
        ? 0.14
        : 0;
    const score = Math.min(1, baseSimilarity + categoryBoost);

    if (!best || score > best.score) {
      best = { score, image: normalizeCoverImageUrl(candidateImage) };
    }
  }

  if (best && best.score >= REUSE_SIMILARITY_THRESHOLD) {
    return best.image;
  }

  return null;
};

const generateWithOpenAi = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          size: "1536x1024",
        }),
      }),
      IMAGE_TIMEOUT_MS,
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      logger.warn({ status: res.status, err: err.slice(0, 300) }, "OpenAI image generation failed");
      return null;
    }

    const payload = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = payload.data?.[0];
    if (!first) return null;
    if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
    if (first.url && isValidHttpImageUrl(first.url)) return first.url;
    return null;
  } catch (error) {
    logger.warn({ error }, "OpenAI image generation request failed");
    return null;
  }
};

const generateWithUnsplash = async ({
  prompt,
  seed: _seed,
}: {
  prompt: string;
  seed: number;
}): Promise<string | null> => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((k) => k.length > 3)
    .slice(0, 8)
    .join(",");

  if (accessKey) {
    try {
      const endpoint = new URL("https://api.unsplash.com/photos/random");
      endpoint.searchParams.set("orientation", "landscape");
      endpoint.searchParams.set("query", `construction,architecture,${keywords}`);
      endpoint.searchParams.set("count", "1");

      const res = await withTimeout(
        fetch(endpoint.toString(), {
          headers: { Authorization: `Client-ID ${accessKey}` },
        }),
        IMAGE_TIMEOUT_MS,
      );
      if (res.ok) {
        const payload = (await res.json()) as Array<{ urls?: { regular?: string } }> | { urls?: { regular?: string } };
        const first = Array.isArray(payload) ? payload[0] : payload;
        const url = first?.urls?.regular ?? null;
        return url && isValidHttpImageUrl(url) ? url : null;
      }
    } catch (error) {
      logger.warn({ error }, "Unsplash API request failed");
    }
  }

  // source.unsplash.com is increasingly unreliable (frequent 503s in production logs),
  // so when API key is absent/fails we intentionally fall through to curated images.
  return null;
};

const pickCuratedImage = (seed: number): string => CURATED_CONSTRUCTION_IMAGES[seed % CURATED_CONSTRUCTION_IMAGES.length];

export const generateImageFromPrompt = async (
  prompt: string,
  options: { seedHint?: string } = {},
): Promise<string | null> => {
  const seed = toSeed(options.seedHint ?? prompt);
  const normalizedPrompt = prompt.trim().toLowerCase().slice(0, 500);
  const cacheKey = `${normalizedPrompt}|${seed}`;
  const cached = promptResultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.image;
  }
  if (cached && cached.expiresAt <= Date.now()) {
    promptResultCache.delete(cacheKey);
  }

  const existing = inFlightPromptMap.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    const openAi = await generateWithOpenAi(prompt);
    if (openAi) return openAi;

    const unsplash = await generateWithUnsplash({ prompt, seed });
    if (unsplash) return unsplash;

    return pickCuratedImage(seed);
  })();

  inFlightPromptMap.set(cacheKey, task);
  try {
    const resolved = await task;
    if (resolved && isValidHttpImageUrl(resolved)) {
      promptResultCache.set(cacheKey, {
        image: resolved,
        expiresAt: Date.now() + PROMPT_CACHE_TTL_MS,
      });
    }
    return resolved;
  } finally {
    inFlightPromptMap.delete(cacheKey);
  }
};

export const generateBlogCoverImage = async (blog: BlogImageInput): Promise<string | null> => {
  const prompt = generateBlogImagePrompt(blog);
  return generateImageFromPrompt(prompt, {
    seedHint: `${blog.title}|${blog.category ?? ""}|${(blog.tags ?? []).join(",")}`,
  });
};

export const resolveBlogCoverImage = async ({
  title,
  category,
  tags = [],
  existingCoverImage,
}: BlogImageInput & { existingCoverImage?: string | null }): Promise<string | null> => {
  if (!isBlank(existingCoverImage)) {
    const persisted = await persistBlogCoverImage({
      image: String(existingCoverImage).trim(),
      slugHint: title,
    });
    return persisted || null;
  }

  const reusable = await getReusableCoverFromExistingBlogs({ title, category, tags });
  if (reusable) {
    logger.info({ title, category }, "Reused cover image from similar post");
    return persistBlogCoverImage({ image: reusable, slugHint: title });
  }

  const generated = await generateBlogCoverImage({ title, category, tags });
  if (!generated) return null;
  return persistBlogCoverImage({ image: generated, slugHint: title });
};
