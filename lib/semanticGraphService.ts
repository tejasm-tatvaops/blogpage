import { connectToDatabase } from "@/lib/db/mongodb";
import { BlogModel } from "@/models/Blog";
import { ForumPostModel } from "@/models/ForumPost";
import { TutorialModel } from "@/models/Tutorial";
import { VideoPostModel } from "@/models/VideoPost";
import { SemanticDocumentModel, type SemanticSourceType } from "@/models/SemanticDocument";

export type SemanticHit = {
  sourceType: SemanticSourceType;
  slug: string;
  title: string;
  excerpt: string;
  snippet: string;
  trustScore: number;
  relevanceScore: number;
};

const tokenize = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );

const jaccard = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let intersection = 0;
  for (const token of sa) if (sb.has(token)) intersection += 1;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
};

export async function rebuildSemanticIndex(options?: { perTypeLimit?: number }) {
  await connectToDatabase();
  const perTypeLimit = Math.min(Math.max(20, options?.perTypeLimit ?? 400), 1200);

  const [blogs, forums, tutorials, shorts] = await Promise.all([
    BlogModel.find({ deleted_at: null, published: true })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(perTypeLimit)
      .select("slug title excerpt content tags category updated_at")
      .lean(),
    ForumPostModel.find({ deleted_at: null })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(perTypeLimit)
      .select("slug title excerpt content tags quality_score is_trending updated_at")
      .lean(),
    TutorialModel.find({ deleted_at: null, published: true })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(perTypeLimit)
      .select("slug title excerpt content tags category difficulty updated_at")
      .lean(),
    VideoPostModel.find({ deletedAt: null, published: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(perTypeLimit)
      .select("slug title summary transcript shortCaption tags category qualityScore updatedAt")
      .lean(),
  ]);

  const docs = [
    ...blogs.map((row) => {
      const title = String((row as { title?: string }).title ?? "");
      const excerpt = String((row as { excerpt?: string }).excerpt ?? "");
      const content = String((row as { content?: string }).content ?? "");
      const tags = Array.isArray((row as { tags?: string[] }).tags) ? ((row as { tags?: string[] }).tags ?? []) : [];
      const category = String((row as { category?: string }).category ?? "");
      const snippet = content.slice(0, 4000);
      return {
        source_type: "blog" as const,
        slug: String((row as { slug?: string }).slug ?? ""),
        title,
        excerpt,
        snippet,
        tags,
        category,
        trust_score: 0.84,
        token_cache: tokenize([title, excerpt, category, tags.join(" "), snippet].join(" ")),
        source_updated_at: (row as { updated_at?: Date }).updated_at ?? null,
      };
    }),
    ...forums.map((row) => {
      const title = String((row as { title?: string }).title ?? "");
      const excerpt = String((row as { excerpt?: string }).excerpt ?? "");
      const content = String((row as { content?: string }).content ?? "");
      const tags = Array.isArray((row as { tags?: string[] }).tags) ? ((row as { tags?: string[] }).tags ?? []) : [];
      const quality = Number((row as { quality_score?: number }).quality_score ?? 0);
      const trending = Boolean((row as { is_trending?: boolean }).is_trending);
      return {
        source_type: "forum" as const,
        slug: String((row as { slug?: string }).slug ?? ""),
        title,
        excerpt,
        snippet: content.slice(0, 3000),
        tags,
        category: "",
        trust_score: Math.min(0.8, 0.45 + quality * 0.35 + (trending ? 0.08 : 0)),
        token_cache: tokenize([title, excerpt, tags.join(" "), content.slice(0, 1000)].join(" ")),
        source_updated_at: (row as { updated_at?: Date }).updated_at ?? null,
      };
    }),
    ...tutorials.map((row) => {
      const title = String((row as { title?: string }).title ?? "");
      const excerpt = String((row as { excerpt?: string }).excerpt ?? "");
      const content = String((row as { content?: string }).content ?? "");
      const tags = Array.isArray((row as { tags?: string[] }).tags) ? ((row as { tags?: string[] }).tags ?? []) : [];
      const category = String((row as { category?: string }).category ?? "");
      return {
        source_type: "tutorial" as const,
        slug: String((row as { slug?: string }).slug ?? ""),
        title,
        excerpt,
        snippet: content.slice(0, 3500),
        tags,
        category,
        trust_score: 0.92,
        token_cache: tokenize([title, excerpt, category, tags.join(" "), content.slice(0, 1200)].join(" ")),
        source_updated_at: (row as { updated_at?: Date }).updated_at ?? null,
      };
    }),
    ...shorts.map((row) => {
      const title = String((row as { title?: string }).title ?? "");
      const summary = String((row as { summary?: string }).summary ?? "");
      const caption = String((row as { shortCaption?: string }).shortCaption ?? "");
      const transcript = String((row as { transcript?: string }).transcript ?? "");
      const tags = Array.isArray((row as { tags?: string[] }).tags) ? ((row as { tags?: string[] }).tags ?? []) : [];
      const category = String((row as { category?: string }).category ?? "");
      const quality = Number((row as { qualityScore?: number }).qualityScore ?? 0.4);
      return {
        source_type: "short" as const,
        slug: String((row as { slug?: string }).slug ?? ""),
        title,
        excerpt: summary || caption,
        snippet: (transcript || summary || caption).slice(0, 1500),
        tags,
        category,
        trust_score: Math.min(0.75, 0.3 + quality * 0.45),
        token_cache: tokenize([title, summary, caption, tags.join(" "), transcript.slice(0, 400)].join(" ")),
        source_updated_at: (row as { updatedAt?: Date }).updatedAt ?? null,
      };
    }),
  ].filter((doc) => doc.slug && doc.title);

  if (docs.length === 0) {
    return { indexed: 0 };
  }

  await Promise.all(
    docs.map((doc) =>
      SemanticDocumentModel.updateOne(
        { source_type: doc.source_type, slug: doc.slug },
        { $set: doc },
        { upsert: true },
      ),
    ),
  );

  return { indexed: docs.length };
}

export async function searchSemanticHits(input: {
  query: string;
  limit?: number;
  exclude?: { sourceType?: SemanticSourceType; slug?: string };
}): Promise<SemanticHit[]> {
  await connectToDatabase();
  const queryTokens = tokenize(input.query);
  if (queryTokens.length === 0) return [];

  const total = await SemanticDocumentModel.countDocuments({});
  if (total === 0) {
    await rebuildSemanticIndex();
  }

  const docs = await SemanticDocumentModel.find({})
    .select("source_type slug title excerpt snippet trust_score token_cache")
    .limit(2000)
    .lean();

  const scored = docs
    .map((row) => {
      const sourceType = (row as { source_type?: SemanticSourceType }).source_type ?? "blog";
      const slug = String((row as { slug?: string }).slug ?? "");
      if (
        input.exclude?.slug &&
        slug === input.exclude.slug &&
        (!input.exclude.sourceType || input.exclude.sourceType === sourceType)
      ) {
        return null;
      }
      const tokenCache = Array.isArray((row as { token_cache?: string[] }).token_cache)
        ? ((row as { token_cache?: string[] }).token_cache ?? [])
        : [];
      const relevance = jaccard(queryTokens, tokenCache);
      if (relevance <= 0) return null;
      const trust = Number((row as { trust_score?: number }).trust_score ?? 0.6);
      return {
        sourceType,
        slug,
        title: String((row as { title?: string }).title ?? ""),
        excerpt: String((row as { excerpt?: string }).excerpt ?? ""),
        snippet: String((row as { snippet?: string }).snippet ?? ""),
        trustScore: trust,
        relevanceScore: relevance,
        finalScore: relevance * 0.7 + trust * 0.3,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, Math.min(Math.max(1, input.limit ?? 10), 20));

  return scored.map(({ finalScore: _ignored, ...rest }) => rest);
}

