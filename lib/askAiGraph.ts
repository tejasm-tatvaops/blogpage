import type { BlogPost } from "@/lib/blogService";
import { getRelatedPosts } from "@/lib/blogService";
import { getRelatedForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getVideosByTags } from "@/lib/videoService";

type GraphSource = {
  sourceType: "blog" | "forum" | "tutorial" | "short";
  slug: string;
  title: string;
  excerpt: string;
  snippet: string;
  trustScore: number;
  relevanceScore: number;
};

const truncateWords = (value: string | null | undefined, maxWords: number): string => {
  if (!value) return "";
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")} ...`;
};

export async function buildAskAiGraphContext(currentPost: BlogPost): Promise<{
  contextText: string;
  sources: GraphSource[];
  sourceMix: Record<GraphSource["sourceType"], number>;
}> {
  const tags = currentPost.tags ?? [];
  const [relatedBlogs, relatedForums, tutorialsResult, relatedShorts] = await Promise.all([
    getRelatedPosts(currentPost, 4).catch(() => []),
    getRelatedForumPosts(tags, undefined, 4).catch(() => []),
    getTutorials({ tag: tags[0] ?? null, limit: 4, includeUnpublished: false }).catch(() => ({ tutorials: [] })),
    getVideosByTags(tags, 4).catch(() => []),
  ]);

  const rawSources: GraphSource[] = [
    {
      sourceType: "blog" as const,
      slug: currentPost.slug,
      title: currentPost.title,
      excerpt: currentPost.excerpt,
      snippet: truncateWords(currentPost.content, 900),
      trustScore: 0.84,
      relevanceScore: 1,
    },
    ...relatedBlogs.map((item) => ({
      sourceType: "blog" as const,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      snippet: truncateWords(item.content, 250),
      trustScore: Math.min(
        0.82,
        0.58 +
          Math.min((item.view_count ?? 0) / 4000, 0.14) +
          Math.min(((item as { upvotes?: number }).upvotes ?? 0) / 120, 0.1),
      ),
      relevanceScore: 0.74,
    })),
    ...relatedForums.map((item) => ({
      sourceType: "forum" as const,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      snippet: truncateWords(item.content, 220),
      trustScore: (item as { best_comment_id?: string | null }).best_comment_id ? 0.66 : 0.52,
      relevanceScore: 0.63,
    })),
    ...((tutorialsResult.tutorials as Array<{
      slug: string;
      title: string;
      excerpt: string;
      content?: string;
    }>) ?? []).map((item) => ({
      sourceType: "tutorial" as const,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      snippet: truncateWords(item.content ?? item.excerpt, 220),
      trustScore: 0.92,
      relevanceScore: 0.86,
    })),
    ...relatedShorts.map((item) => ({
      sourceType: "short" as const,
      slug: item.slug,
      title: item.title,
      excerpt: item.summary ?? item.shortCaption ?? "",
      snippet: truncateWords(item.transcript ?? item.summary ?? item.shortCaption ?? "", 180),
      trustScore: 0.34,
      relevanceScore: 0.46,
    })),
  ];

  const tokenize = (value: string): Set<string> =>
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    );
  const jaccard = (a: Set<string>, b: Set<string>): number => {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) if (b.has(token)) intersection += 1;
    const union = new Set([...a, ...b]).size;
    return union > 0 ? intersection / union : 0;
  };
  const sourceTypePriority: Record<GraphSource["sourceType"], number> = {
    tutorial: 1,
    blog: 0.8,
    forum: 0.55,
    short: 0.28,
  };
  const scored = rawSources
    .map((source) => {
      const similarity = jaccard(tokenize(`${currentPost.title} ${currentPost.excerpt}`), tokenize(`${source.title} ${source.excerpt} ${source.snippet}`));
      const score = source.relevanceScore * 0.45 + source.trustScore * 0.35 + sourceTypePriority[source.sourceType] * 0.2 + similarity * 0.15;
      return { ...source, score };
    })
    .sort((a, b) => b.score - a.score);

  const sources: GraphSource[] = [];
  for (const source of scored) {
    const nearDuplicate = sources.some(
      (existing) => jaccard(tokenize(`${existing.title} ${existing.excerpt}`), tokenize(`${source.title} ${source.excerpt}`)) >= 0.78,
    );
    if (nearDuplicate) continue;
    sources.push(source);
    if (sources.length >= 14) break;
  }

  const sourceMix = sources.reduce<Record<GraphSource["sourceType"], number>>(
    (acc, source) => {
      acc[source.sourceType] += 1;
      return acc;
    },
    { blog: 0, forum: 0, tutorial: 0, short: 0 },
  );

  const contextText = sources
    .map((source, index) => {
      const ref = `[S${index + 1}]`;
      return `${ref} (${source.sourceType}:${source.slug})
Title: ${source.title}
Excerpt: ${source.excerpt}
Snippet:
${source.snippet}`;
    })
    .join("\n\n---\n\n");

  return { contextText, sources, sourceMix };
}

export function buildSourceAppendix(sources: GraphSource[]): string {
  if (sources.length === 0) return "";
  const lines = ["\n\nSources:"];
  sources.forEach((source, index) => {
    const routeBase =
      source.sourceType === "forum"
        ? "/forums"
        : source.sourceType === "tutorial"
          ? "/tutorials"
          : source.sourceType === "short"
            ? "/shorts"
            : "/blog";
    lines.push(`- [S${index + 1}] ${source.title} (${routeBase}/${source.slug})`);
  });
  return lines.join("\n");
}

