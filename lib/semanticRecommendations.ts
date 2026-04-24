import type { BlogPost } from "@/lib/blogService";
import { connectToDatabase } from "@/lib/db/mongodb";
import { FeedEventModel } from "@/models/FeedEvent";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { recordMetric } from "@/lib/observability";
import { recordRecommendationQualitySample } from "@/lib/recommendationQualityMetrics";

type TutorialLite = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | string;
};

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

const difficultyOrder: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

type RankingOptions = {
  behavioralBoostEnabled?: boolean;
  recommendationDiversityEnabled?: boolean;
  recommendationFreshnessEnabled?: boolean;
  requestId?: string;
};

const toEpoch = (value: string | Date | undefined): number => {
  if (!value) return 0;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
};

const computeFreshnessBoost = (createdAt: string | Date | undefined): number => {
  const ts = toEpoch(createdAt);
  if (!ts) return 0;
  const ageDays = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  return Math.max(0, 0.12 * Math.exp(-ageDays / 20));
};

async function getBehavioralBlogBoostMap(
  currentSlug: string,
  candidateSlugs: string[],
): Promise<Map<string, number>> {
  if (!candidateSlugs.length) return new Map();
  await connectToDatabase();
  const identities = await FeedEventModel.distinct("identity_key", {
    post_slug: currentSlug,
    event_type: { $in: ["post_clicked", "recommendation_click"] },
  });
  if (!identities.length) return new Map();
  const rows = await FeedEventModel.aggregate<{ _id: string; clicks: number }>([
    {
      $match: {
        identity_key: { $in: identities.slice(0, 2000) },
        post_slug: { $in: candidateSlugs },
        event_type: { $in: ["post_clicked", "recommendation_click"] },
      },
    },
    { $group: { _id: "$post_slug", clicks: { $sum: 1 } } },
  ]);
  const maxClicks = Math.max(1, ...rows.map((row) => row.clicks));
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row._id, Math.min(0.25, (row.clicks / maxClicks) * 0.25));
  }
  return map;
}

async function getBehavioralTutorialBoostMap(
  currentSlug: string,
  candidateSlugs: string[],
): Promise<Map<string, number>> {
  if (!candidateSlugs.length) return new Map();
  await connectToDatabase();
  const completedIdentities = await TutorialProgressModel.distinct("identity_key", {
    tutorial_slug: currentSlug,
    completed: true,
  });
  if (!completedIdentities.length) return new Map();
  const rows = await TutorialProgressModel.aggregate<{ _id: string; completions: number }>([
    {
      $match: {
        identity_key: { $in: completedIdentities.slice(0, 2000) },
        tutorial_slug: { $in: candidateSlugs },
        completed: true,
      },
    },
    { $group: { _id: "$tutorial_slug", completions: { $sum: 1 } } },
  ]);
  const maxCompletions = Math.max(1, ...rows.map((row) => row.completions));
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row._id, Math.min(0.28, (row.completions / maxCompletions) * 0.28));
  }
  return map;
}

function rerankWithDiversity<T extends { tags?: string[]; category?: string }, S extends { candidate: T; score: number }>(
  ranked: S[],
  limit: number,
): S[] {
  const selected: S[] = [];
  const remaining = [...ranked];
  const seenPrimaryTags = new Set<string>();
  const seenCategories = new Set<string>();
  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestAdjusted = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const item = remaining[i];
      const primaryTag = (item.candidate.tags?.[0] ?? "").toLowerCase();
      const category = (item.candidate.category ?? "").toLowerCase();
      const duplicatePenalty = (seenPrimaryTags.has(primaryTag) ? 0.06 : 0) + (seenCategories.has(category) ? 0.04 : 0);
      const adjusted = item.score - duplicatePenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIdx = i;
      }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    selected.push(picked);
    seenPrimaryTags.add((picked.candidate.tags?.[0] ?? "").toLowerCase());
    seenCategories.add((picked.candidate.category ?? "").toLowerCase());
  }
  return selected;
}

export async function rankSemanticBlogRecommendations(
  currentPost: BlogPost,
  candidates: BlogPost[],
  limit = 4,
  options: RankingOptions = {},
): Promise<BlogPost[]> {
  const {
    behavioralBoostEnabled = true,
    recommendationDiversityEnabled = true,
    recommendationFreshnessEnabled = true,
    requestId,
  } = options;
  const currentTokens = tokenize(
    [currentPost.title, currentPost.excerpt, currentPost.category, ...(currentPost.tags ?? [])].join(" "),
  );
  const candidatePool = candidates.filter((candidate) => candidate.slug !== currentPost.slug);
  const behavioralBoostMap = behavioralBoostEnabled
    ? await getBehavioralBlogBoostMap(currentPost.slug, candidatePool.map((candidate) => candidate.slug))
    : new Map<string, number>();

  const ranked = candidatePool
    .map((candidate) => {
      const candidateTokens = tokenize(
        [candidate.title, candidate.excerpt, candidate.category, ...(candidate.tags ?? [])].join(" "),
      );
      const conceptualSimilarity = jaccard(currentTokens, candidateTokens);
      const categoryBoost = candidate.category === currentPost.category ? 0.12 : 0;
      const sharedTagBoost = Math.min(
        0.2,
        (candidate.tags.filter((tag) => currentPost.tags.includes(tag)).length / Math.max(1, currentPost.tags.length)) *
          0.25,
      );
      const behavioralBoost = behavioralBoostMap.get(candidate.slug) ?? 0;
      const freshnessBoost = recommendationFreshnessEnabled ? computeFreshnessBoost(candidate.created_at) : 0;
      const score = conceptualSimilarity * 0.58 + categoryBoost + sharedTagBoost + behavioralBoost + freshnessBoost;
      return { candidate, score, conceptualSimilarity, behavioralBoost, freshnessBoost };
    })
    .sort((a, b) => b.score - a.score);

  const reranked = recommendationDiversityEnabled
    ? rerankWithDiversity(ranked, limit)
    : ranked.slice(0, limit);

  recordMetric("recommendation.rank_summary", {
    scope: "blog",
    request_id: requestId ?? null,
    candidate_count: candidatePool.length,
    selected_count: reranked.length,
    behavioral_enabled: behavioralBoostEnabled,
    diversity_enabled: recommendationDiversityEnabled,
    freshness_enabled: recommendationFreshnessEnabled,
    behavioral_influence_avg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.behavioralBoost, 0) / reranked.length).toFixed(4))
        : 0,
    freshness_influence_avg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.freshnessBoost, 0) / reranked.length).toFixed(4))
        : 0,
    diversity_unique_primary_tags: new Set(reranked.map((item) => item.candidate.tags?.[0] ?? "")).size,
  });
  recordRecommendationQualitySample({
    scope: "blog",
    candidateCount: candidatePool.length,
    selectedCount: reranked.length,
    behavioralInfluenceAvg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.behavioralBoost, 0) / reranked.length).toFixed(4))
        : 0,
    freshnessInfluenceAvg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.freshnessBoost, 0) / reranked.length).toFixed(4))
        : 0,
    diversityUniquePrimaryTags: new Set(reranked.map((item) => item.candidate.tags?.[0] ?? "")).size,
  });

  return reranked.map((item) => item.candidate);
}

export async function rankSemanticTutorialRecommendations(
  currentTutorial: TutorialLite,
  candidates: TutorialLite[],
  limit = 4,
  options: RankingOptions = {},
): Promise<TutorialLite[]> {
  const {
    behavioralBoostEnabled = true,
    recommendationDiversityEnabled = true,
    recommendationFreshnessEnabled = true,
    requestId,
  } = options;
  const currentTokens = tokenize(
    [currentTutorial.title, currentTutorial.excerpt, currentTutorial.category, ...(currentTutorial.tags ?? [])].join(" "),
  );
  const currentDifficulty = difficultyOrder[(currentTutorial.difficulty ?? "beginner").toLowerCase()] ?? 0;
  const candidatePool = candidates.filter((candidate) => candidate.slug !== currentTutorial.slug);
  const behavioralBoostMap = behavioralBoostEnabled
    ? await getBehavioralTutorialBoostMap(currentTutorial.slug, candidatePool.map((candidate) => candidate.slug))
    : new Map<string, number>();

  const ranked = candidatePool
    .map((candidate) => {
      const candidateTokens = tokenize(
        [candidate.title, candidate.excerpt, candidate.category, ...(candidate.tags ?? [])].join(" "),
      );
      const conceptualSimilarity = jaccard(currentTokens, candidateTokens);
      const candidateDifficulty = difficultyOrder[(candidate.difficulty ?? "beginner").toLowerCase()] ?? 0;
      const diffDelta = candidateDifficulty - currentDifficulty;
      const progressionBoost = diffDelta === 1 ? 0.14 : diffDelta === 0 ? 0.08 : diffDelta === -1 ? 0.03 : 0;
      const behavioralBoost = behavioralBoostMap.get(candidate.slug) ?? 0;
      const freshnessBoost = recommendationFreshnessEnabled ? computeFreshnessBoost((candidate as { created_at?: Date | string }).created_at) : 0;
      const score = conceptualSimilarity * 0.62 + progressionBoost + behavioralBoost + freshnessBoost;
      return { candidate, score, conceptualSimilarity, behavioralBoost, freshnessBoost };
    })
    .sort((a, b) => b.score - a.score);

  const reranked = recommendationDiversityEnabled
    ? rerankWithDiversity(ranked, limit)
    : ranked.slice(0, limit);

  recordMetric("recommendation.rank_summary", {
    scope: "tutorial",
    request_id: requestId ?? null,
    candidate_count: candidatePool.length,
    selected_count: reranked.length,
    behavioral_enabled: behavioralBoostEnabled,
    diversity_enabled: recommendationDiversityEnabled,
    freshness_enabled: recommendationFreshnessEnabled,
    behavioral_influence_avg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.behavioralBoost, 0) / reranked.length).toFixed(4))
        : 0,
    diversity_unique_primary_tags: new Set(reranked.map((item) => item.candidate.tags?.[0] ?? "")).size,
  });
  recordRecommendationQualitySample({
    scope: "tutorial",
    candidateCount: candidatePool.length,
    selectedCount: reranked.length,
    behavioralInfluenceAvg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.behavioralBoost, 0) / reranked.length).toFixed(4))
        : 0,
    freshnessInfluenceAvg:
      reranked.length > 0
        ? Number((reranked.reduce((acc, item) => acc + item.freshnessBoost, 0) / reranked.length).toFixed(4))
        : 0,
    diversityUniquePrimaryTags: new Set(reranked.map((item) => item.candidate.tags?.[0] ?? "")).size,
  });

  return reranked.map((item) => item.candidate);
}

