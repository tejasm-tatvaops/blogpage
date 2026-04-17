/**
 * Feed Service — v2 Multi-Stage Ranking Pipeline
 * ────────────────────────────────────────────────
 *
 * STAGE 1 — CANDIDATE GENERATION  (3 buckets)
 * ─────────────────────────────────────────────
 *   60%  Personalized  getPersonalizedCandidates() — persona tag match, recent posts
 *   30%  Trending      getTrendingCandidates()      — HackerNews-style decay score
 *   10%  Exploration   getExplorationPosts()         — $sample, fights echo chambers
 *
 * STAGE 2 — SCORING  (5 components)
 * ───────────────────────────────────
 *   score =
 *     interest_match   × 0.40   (personaService.computeInterestMatch)
 *   + engagement_score × 0.25   (likes×3 + comments×5) / (views+10)
 *   + recency_score    × 0.20   exp(-0.05 × hours_since_post)
 *   + author_quality   × 0.10   log(1 + rep) / log(1 + 5000)
 *   + diversity_boost  × 0.05   ±0.15 based on tag freshness in current page
 *
 * STAGE 3 — DIVERSITY ENFORCEMENT
 * ─────────────────────────────────
 *   After ranking:
 *   • Max 2 posts from the same author in the top-N
 *   • Max 3 posts sharing the same primary tag in the top-N
 *   • Buckets are merged deduplicated before scoring
 *
 * COLD START
 * ──────────
 *   No persona → returns pure trending slice (no personalization attempted)
 *
 * AUTHOR QUALITY
 * ──────────────
 *   Requires author reputation scores. The feed enriches posts with their
 *   author's UserProfile.reputation_score using a single batched query.
 */

import {
  type BlogPost,
  getAllPosts,
  getPromisingExplorationCandidates,
  getTrendingCandidatesMultiWindow,
} from "./blogService";
import {
  computeInterestMatch,
  computeEngagementScore,
  computeRecencyScore,
  computeAuthorQuality,
  normaliseTag,
} from "./personaService";
import { connectToDatabase } from "./mongodb";
import { UserProfileModel } from "@/models/UserProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedCandidate = BlogPost & { _bucket: "personalized" | "trending" | "exploration" };

export type FeedResult = {
  posts: BlogPost[];
  page: number;
  has_persona: boolean;
  top_interests: string[];
  bucket_distribution: { personalized: number; trending: number; exploration: number };
  session_updates?: {
    recent_tags_seen: string[];
    recent_authors_seen: string[];
  };
};

// ─── Bucket sizes (total candidate pool before scoring) ──────────────────────

const POOL_SIZE       = 120;  // total candidates fetched across 3 buckets
const PCT_PERSONALIZED = 0.60;
const PCT_TRENDING     = 0.30;
const PCT_EXPLORATION  = 0.10;

// ─── Scoring weights ──────────────────────────────────────────────────────────

const W_INTEREST    = 0.40;
const W_ENGAGEMENT  = 0.25;
const W_RECENCY     = 0.20;
const W_AUTHOR      = 0.10;
const W_DIVERSITY   = 0.05;
const W_EXPLORATION = 0.08;
const W_NEGATIVE    = 0.08;

const DIVERSITY_BONUS  =  0.15;  // tag not seen yet in this page
const DIVERSITY_PENALTY = -0.20; // tag already appeared ≥3 times

// ─── Diversity enforcement ────────────────────────────────────────────────────

const MAX_SAME_AUTHOR = 2;
const MAX_SAME_TAG    = 3;

// ─── Author quality lookup ────────────────────────────────────────────────────

/**
 * Batch-fetch reputation scores for all unique authors in the candidate set.
 * Returns a map of  author_name → reputation_score.
 */
const fetchAuthorReputation = async (
  posts: BlogPost[],
): Promise<Map<string, number>> => {
  await connectToDatabase();
  const names = [...new Set(posts.map((p) => p.author.toLowerCase().trim()))];
  if (names.length === 0) return new Map();

  // Author profiles are keyed as "author:<sanitised_name>" in UserProfile
  const identityKeys = names.map((n) => `author:${n.replace(/[^a-z0-9]+/g, "-")}`);
  const docs = await UserProfileModel.find({ identity_key: { $in: identityKeys } })
    .select("identity_key reputation_score")
    .lean();

  const map = new Map<string, number>();
  for (const doc of docs as unknown as Array<{ identity_key: string; reputation_score: number }>) {
    // Strip "author:" prefix to get back the normalised name
    const name = doc.identity_key.replace(/^author:/, "");
    map.set(name, doc.reputation_score ?? 0);
  }
  return map;
};

// ─── Stage 1: Candidate generation ───────────────────────────────────────────

const getPersonalizedCandidates = async (
  personaVector: Array<{ tag: string; weight: number }>,
  n: number,
  category?: string,
): Promise<FeedCandidate[]> => {
  if (personaVector.length === 0) return [];

  // Pull a larger set so we have room to rank down by interest match
  const posts = await getAllPosts({ sort: "latest", limit: n * 3, category });

  // Pre-score by interest match and keep the top-n
  const scored = posts
    .map((p) => ({
      post: p,
      score: computeInterestMatch(p.tags, p.category, personaVector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);

  return scored.map(({ post }) => ({ ...post, _bucket: "personalized" as const }));
};

// ─── Stage 2: Score computation ───────────────────────────────────────────────

type ScoredCandidate = {
  post: FeedCandidate;
  score: number;
  interestMatch: number;
};

export type FeedScoringWeights = {
  interest: number;
  engagement: number;
  recency: number;
  author: number;
  diversity: number;
  exploration: number;
  negative: number;
};

const DEFAULT_WEIGHTS: FeedScoringWeights = {
  interest: W_INTEREST,
  engagement: W_ENGAGEMENT,
  recency: W_RECENCY,
  author: W_AUTHOR,
  diversity: W_DIVERSITY,
  exploration: W_EXPLORATION,
  negative: W_NEGATIVE,
};

const scoreCandidate = (
  post: FeedCandidate,
  personaVector: Array<{ tag: string; weight: number }>,
  authorRepMap: Map<string, number>,
  tagFrequency: Map<string, number>,  // current page tag counts
  sessionRecent: { tags: string[]; authors: string[] },
  weights: FeedScoringWeights,
): ScoredCandidate => {
  const d = post as unknown as {
    upvote_count: number;
    downvote_count: number;
    view_count: number;
    comment_count?: number;
    created_at: string;
  };

  const interestMatch = computeInterestMatch(post.tags, post.category, personaVector);

  const rawEngagement = computeEngagementScore(
    d.upvote_count ?? 0,
    d.comment_count ?? 0,
    d.view_count ?? 0,
  );
  // Engagement is unbounded — cap at a reference max of 5 for normalisation
  const engagementScore = Math.min(1, rawEngagement / 5);

  const recencyScore = computeRecencyScore(new Date(d.created_at));

  const authorKey = post.author.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const authorRep = authorRepMap.get(authorKey) ?? 0;
  const authorQuality = computeAuthorQuality(authorRep);

  // Diversity boost: check if primary tag already saturated on this page
  const primaryTag = normaliseTag(post.tags[0] ?? post.category);
  const freq = tagFrequency.get(primaryTag) ?? 0;
  const diversityBoost = freq === 0 ? DIVERSITY_BONUS : freq >= MAX_SAME_TAG ? DIVERSITY_PENALTY : 0;
  const earlyEngagement = Math.min(1, ((d.upvote_count ?? 0) * 3 + (d.comment_count ?? 0) * 4) / Math.max(1, d.view_count ?? 0));
  const explorationScore = 0.6 * earlyEngagement + 0.4 * Math.exp(-Math.max(0, (Date.now() - new Date(d.created_at).getTime()) / 3_600_000) / 18);
  const authorRepeatPenalty = sessionRecent.authors.includes(authorKey) ? 0.35 : 0;
  const tagRepeatPenalty = sessionRecent.tags.includes(primaryTag) ? 0.4 : 0;
  const negativePenalty = Math.min(1, authorRepeatPenalty + tagRepeatPenalty);

  const score =
    interestMatch   * weights.interest +
    engagementScore * weights.engagement +
    recencyScore    * weights.recency +
    authorQuality   * weights.author +
    diversityBoost  * weights.diversity +
    explorationScore * weights.exploration -
    negativePenalty * weights.negative;

  return { post, score, interestMatch };
};

// ─── Stage 3: Diversity enforcement ──────────────────────────────────────────

const enforceDiversity = (
  ranked: ScoredCandidate[],
  limit: number,
): FeedCandidate[] => {
  const result: FeedCandidate[] = [];
  const authorCount = new Map<string, number>();
  const tagCount    = new Map<string, number>();

  for (const { post } of ranked) {
    if (result.length >= limit) break;

    const author = post.author.toLowerCase();
    if ((authorCount.get(author) ?? 0) >= MAX_SAME_AUTHOR) continue;

    const primaryTag = normaliseTag(post.tags[0] ?? post.category);
    if ((tagCount.get(primaryTag) ?? 0) >= MAX_SAME_TAG) continue;

    result.push(post);
    authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
    tagCount.set(primaryTag, (tagCount.get(primaryTag) ?? 0) + 1);
  }

  // If diversity enforcement was too aggressive, backfill with next-best posts
  if (result.length < limit) {
    const used = new Set(result.map((p) => p.id));
    for (const { post } of ranked) {
      if (result.length >= limit) break;
      if (!used.has(post.id)) result.push(post);
    }
  }

  return result;
};

// ─── Main pipeline ────────────────────────────────────────────────────────────

export const buildFeed = async ({
  personaVector,
  limit = 20,
  page  = 1,
  category,
  sessionRecent,
  scoringWeights,
  onStage,
}: {
  personaVector: Array<{ tag: string; weight: number }>;
  limit?: number;
  page?: number;
  category?: string;
  sessionRecent?: { tags: string[]; authors: string[] };
  scoringWeights?: FeedScoringWeights;
  onStage?: (stage: "candidates" | "scoring") => void;
}): Promise<FeedResult> => {
  const safePage  = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const hasPersona = personaVector.length > 0;
  const weights = scoringWeights ?? DEFAULT_WEIGHTS;
  const session = sessionRecent ?? { tags: [], authors: [] };

  // ── COLD START: no persona → pure trending ────────────────────────────────
  if (!hasPersona) {
    const trending = await getTrendingCandidatesMultiWindow(safeLimit * 2);
    const slice = trending.slice((safePage - 1) * safeLimit, safePage * safeLimit);
    return {
      posts: slice,
      page: safePage,
      has_persona: false,
      top_interests: [],
      bucket_distribution: { personalized: 0, trending: slice.length, exploration: 0 },
    };
  }

  // ── STAGE 1: Candidate generation ─────────────────────────────────────────
  const nPersonalized = Math.round(POOL_SIZE * PCT_PERSONALIZED);
  const nTrending     = Math.round(POOL_SIZE * PCT_TRENDING);
  const nExploration  = Math.round(POOL_SIZE * PCT_EXPLORATION);

  const [personalizedRaw, trendingRaw, explorationRaw] = await Promise.all([
    getPersonalizedCandidates(personaVector, nPersonalized, category),
    getTrendingCandidatesMultiWindow(nTrending).then((p) => p.map((x) => ({ ...x, _bucket: "trending" as const }))),
    getPromisingExplorationCandidates(nExploration).then((p) => p.map((x) => ({ ...x, _bucket: "exploration" as const }))),
  ]);
  onStage?.("candidates");

  // Deduplicate by post ID (personalized wins if same post appears in multiple buckets)
  const seen = new Set<string>();
  const candidates: FeedCandidate[] = [];
  for (const post of [...personalizedRaw, ...trendingRaw, ...explorationRaw]) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      candidates.push(post);
    }
  }

  if (candidates.length === 0) {
    return { posts: [], page: safePage, has_persona: true, top_interests: [], bucket_distribution: { personalized: 0, trending: 0, exploration: 0 } };
  }

  // ── STAGE 2: Scoring ──────────────────────────────────────────────────────
  const authorRepMap = await fetchAuthorReputation(candidates);
  const tagFrequency = new Map<string, number>(); // resets per scoring batch

  const scored: ScoredCandidate[] = candidates.map((post) =>
    scoreCandidate(post, personaVector, authorRepMap, tagFrequency, session, weights),
  );

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  onStage?.("scoring");

  // ── STAGE 3: Diversity + pagination ──────────────────────────────────────
  // Enforce diversity over the whole ranked list, then paginate
  const diversified = enforceDiversity(scored, POOL_SIZE);
  const skip  = (safePage - 1) * safeLimit;
  const page_slice = diversified.slice(skip, skip + safeLimit);

  // Stats for response meta
  const dist = page_slice.reduce(
    (acc, p) => {
      acc[p._bucket] += 1;
      return acc;
    },
    { personalized: 0, trending: 0, exploration: 0 },
  );

  const topInterests = personaVector
    .slice(0, 5)
    .map((p) => p.tag);

  return {
    posts: page_slice,
    page: safePage,
    has_persona: true,
    top_interests: topInterests,
    bucket_distribution: dist,
    session_updates: {
      recent_tags_seen: page_slice.map((p) => normaliseTag(p.tags[0] ?? p.category)).filter(Boolean).slice(0, 10),
      recent_authors_seen: page_slice.map((p) => p.author.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")).filter(Boolean).slice(0, 10),
    },
  };
};
