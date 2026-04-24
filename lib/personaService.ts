/**
 * Persona Service — v2
 * ────────────────────
 * Builds and maintains a per-user interest vector on UserProfile.interest_tags.
 *
 * WRITE-TIME DECAY  (on every interaction)
 * ─────────────────────────────────────────
 *   existing_weight *= DECAY_FACTOR (0.97)
 *   → weight 100 → ~50 after ~23 interactions without reinforcement
 *
 * READ-TIME DECAY  (called by feed generation)
 * ─────────────────────────────────────────────
 *   time-based decay proportional to hours since last interaction.
 *   Avoids stale vectors dominating the feed for inactive users.
 *   → 1 day gap  → ×0.998 per hour ≈ ×0.95 per day
 *   → 7 day gap  → weights at ~70% of recorded value
 *   → 30 day gap → weights at ~30%
 *
 * CAP & PRUNE
 * ───────────
 *   MAX_WEIGHT = 100  (single tag ceiling)
 *   MIN_WEIGHT = 0.5  (prune threshold — removes ghost entries)
 *   MAX_TAGS   = 60   (keep highest-weight entries only)
 *
 * ANTI-GAMING: SAME-TAG BURST SUPPRESSION
 * ─────────────────────────────────────────
 *   If the same tag is boosted > BURST_LIMIT times within BURST_WINDOW_MS
 *   the delta is discarded silently.  Tracked in a module-level in-process map.
 *
 * ACTION WEIGHTS
 * ──────────────
 *   like / upvote  : +6
 *   comment        : +4
 *   view           : +1
 *   forum_post     : +5
 *   forum_comment  : +3
 *   forum_vote     : +1
 *
 * V2 SCORING FORMULA  (used by feedService.computePostScore)
 * ───────────────────────────────────────────────────────────
 *   score =
 *     interest_match  × 0.40   (persona overlap)
 *   + engagement_score × 0.25  (CTR-adjusted quality signal)
 *   + recency_score    × 0.20  (smooth exp decay over 72h)
 *   + author_quality   × 0.10  (log-scaled reputation)
 *   + diversity_boost  × 0.05  (tag-freshness in current page)
 */

import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel, getReputationTier } from "@/models/UserProfile";

// ─── Constants ────────────────────────────────────────────────────────────────

const WRITE_DECAY   = 0.97;   // per-interaction decay factor
const READ_DECAY_H  = 0.006;  // hourly read-time decay: weight *= (1 - READ_DECAY_H)^hours
const MAX_WEIGHT    = 100;
const MIN_WEIGHT    = 0.5;    // prune below this
const MAX_TAGS      = 60;

// Anti-gaming burst suppression
const BURST_LIMIT    = 20;            // max distinct boosts per tag per window
const BURST_WINDOW   = 60_000;        // 1-minute rolling window (ms)

const ACTION_WEIGHTS = {
  like:          6,
  comment:       4,
  view:          1,
  forum_post:    5,
  forum_comment: 3,
  forum_vote:    1,
  skip:         -2,
  low_dwell:    -3,
  fast_skip:    -6,
} as const;

export type PersonaAction = keyof typeof ACTION_WEIGHTS;

// ─── Anti-gaming state (in-process, resets on cold start) ────────────────────

type BurstEntry = { count: number; windowStart: number };
const burstMap = new Map<string, BurstEntry>(); // key: `${identityKey}:${tag}`

const isBursting = (identityKey: string, tag: string): boolean => {
  const key = `${identityKey}:${tag}`;
  const now = Date.now();
  const entry = burstMap.get(key);
  if (!entry || now - entry.windowStart > BURST_WINDOW) {
    burstMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > BURST_LIMIT;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const normaliseTag = (t: string): string =>
  t.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** Write-time: decay all existing weights + increment new tags, then prune. */
const mergeWeights = (
  existing: Record<string, number>,
  newTags: string[],
  delta: number,
  identityKey: string,
): Record<string, number> => {
  const updated: Record<string, number> = {};

  // 1. Decay existing
  for (const [tag, weight] of Object.entries(existing)) {
    const decayed = (weight as number) * WRITE_DECAY;
    if (decayed >= MIN_WEIGHT) updated[tag] = decayed;
  }

  // 2. Increment new tags (with burst guard)
  for (const raw of newTags) {
    const tag = normaliseTag(raw);
    if (!tag) continue;
    if (isBursting(identityKey, tag)) continue; // anti-gaming: skip burst
    const next = (updated[tag] ?? 0) + delta;
    if (next < MIN_WEIGHT) {
      delete updated[tag];
      continue;
    }
    updated[tag] = Math.min(MAX_WEIGHT, next);
  }

  // 3. Prune to MAX_TAGS by weight descending
  return Object.fromEntries(
    Object.entries(updated)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TAGS),
  );
};

/**
 * Read-time decay: adjusts an in-memory vector for how long ago it was last updated.
 * Does NOT write to DB — used only during feed computation.
 * Formula: w' = w × (1 - READ_DECAY_H)^hours_since_last_update
 */
export const applyReadDecay = (
  vector: Array<{ tag: string; weight: number }>,
  lastInteractionAt: Date,
): Array<{ tag: string; weight: number }> => {
  const hoursSince = Math.max(0, (Date.now() - lastInteractionAt.getTime()) / 3_600_000);
  if (hoursSince < 1) return vector; // no decay needed under 1 hour

  const decayFactor = Math.pow(1 - READ_DECAY_H, hoursSince);
  return vector
    .map(({ tag, weight }) => ({ tag, weight: weight * decayFactor }))
    .filter(({ weight }) => weight >= MIN_WEIGHT);
};

// ─── Public write API ─────────────────────────────────────────────────────────

/**
 * Record an interaction and update the user's interest vector.
 * Fire-and-forget safe — callers may `void` this.
 */
export const recordInterest = async ({
  identityKey,
  tags,
  category,
  action,
}: {
  identityKey: string;
  tags: string[];
  category?: string | null;
  action: PersonaAction;
}): Promise<void> => {
  await connectToDatabase();

  const delta = ACTION_WEIGHTS[action];
  const allSignals = [...tags, ...(category ? [category] : [])].filter(Boolean);
  if (allSignals.length === 0) return;

  const doc = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("interest_tags")
    .lean();

  const existing: Record<string, number> =
    (doc?.interest_tags as Record<string, number> | null) ?? {};
  const updated = mergeWeights(existing, allSignals, delta, identityKey);

  await UserProfileModel.updateOne(
    { identity_key: identityKey },
    { $set: { interest_tags: updated, last_interest_interaction_at: new Date() } },
  );
};

// ─── Public read API ──────────────────────────────────────────────────────────

/**
 * Return the top N interest tags for a user, with optional read-time decay applied.
 * Returns [] if the user has no persona yet.
 */
export const getPersonaVector = async (
  identityKey: string,
  topN = 30,
  applyDecay = true,
): Promise<Array<{ tag: string; weight: number }>> => {
  await connectToDatabase();
  const doc = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("interest_tags last_seen_at last_interest_interaction_at")
    .lean();

  const raw = (doc?.interest_tags as Record<string, number> | null) ?? {};
  let vector = Object.entries(raw)
    .map(([tag, weight]) => ({ tag, weight: weight as number }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN);

  if (applyDecay && (doc?.last_interest_interaction_at || doc?.last_seen_at)) {
    vector = applyReadDecay(
      vector,
      (doc.last_interest_interaction_at as unknown as Date | undefined) ?? (doc.last_seen_at as unknown as Date),
    );
  }

  return vector;
};

export const getAuthorAffinityMap = async (identityKey: string): Promise<Record<string, number>> => {
  await connectToDatabase();
  const doc = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("author_affinity")
    .lean();
  const raw = (doc?.author_affinity as Record<string, number> | undefined) ?? {};
  return raw;
};

export const recordAuthorAffinity = async ({
  identityKey,
  authorKey,
  delta,
}: {
  identityKey: string;
  authorKey: string;
  delta: number;
}): Promise<void> => {
  if (!authorKey) return;
  await connectToDatabase();
  const doc = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("author_affinity")
    .lean();
  const current = (doc?.author_affinity as Record<string, number> | undefined) ?? {};
  const next = { ...current };
  const safeAuthor = authorKey.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const value = Math.max(-40, Math.min(60, Number(next[safeAuthor] ?? 0) + delta));
  if (Math.abs(value) < 0.2) {
    delete next[safeAuthor];
  } else {
    next[safeAuthor] = value;
  }
  const trimmed = Object.fromEntries(
    Object.entries(next)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 120),
  );
  await UserProfileModel.updateOne(
    { identity_key: identityKey },
    { $set: { author_affinity: trimmed, last_interest_interaction_at: new Date() } },
  );
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Compute interest_match: how well a post's signals overlap with the user's persona.
 * Returns 0–1. The denominator is capped at MAX_WEIGHT×5 to prevent any single
 * hyper-weighted tag from making all non-matching posts score 0.
 */
export const computeInterestMatch = (
  postTags: string[],
  postCategory: string,
  personaVector: Array<{ tag: string; weight: number }>,
): number => {
  if (personaVector.length === 0) return 0;

  const maxPossible = personaVector.reduce((s, p) => s + p.weight, 0);
  if (maxPossible === 0) return 0;

  const postSignals = new Set(
    [...postTags, postCategory].map(normaliseTag).filter(Boolean),
  );

  let matched = 0;
  for (const { tag, weight } of personaVector) {
    if (postSignals.has(tag)) matched += weight;
  }

  return Math.min(1, matched / Math.min(maxPossible, MAX_WEIGHT * 5));
};

/**
 * engagement_score = (likes×3 + comments×5) / (views + 10)
 * Normalised by a reference max (default 1.0 → caller normalises across feed batch).
 * The +10 floor on views prevents division-by-zero and dampens zero-view spikes.
 */
export const computeEngagementScore = (
  upvotes: number,
  commentCount: number,
  viewCount: number,
): number => {
  return (upvotes * 3 + commentCount * 5) / (viewCount + 10);
};

/**
 * recency_score = exp(-0.05 × hours_since_post)
 * Today = ~1.0;  24h ago ≈ 0.30;  48h ago ≈ 0.09;  72h ago ≈ 0.03
 */
export const computeRecencyScore = (createdAt: Date): number =>
  Math.exp(-0.05 * Math.max(0, (Date.now() - createdAt.getTime()) / 3_600_000));

/**
 * author_quality = log(1 + reputation_score) / log(1 + MAX_REPUTATION)
 * Normalised to [0, 1] against a ceiling of 5000 rep.
 */
const MAX_REPUTATION_NORM = Math.log(1 + 5000);
export const computeAuthorQuality = (reputationScore: number): number =>
  Math.log(1 + Math.max(0, reputationScore)) / MAX_REPUTATION_NORM;

// ─── Reputation helpers ───────────────────────────────────────────────────────

export const updateReputation = async (
  identityKey: string,
  delta: number,
): Promise<void> => {
  await connectToDatabase();
  if (delta === 0) return;

  const doc = await UserProfileModel.findOneAndUpdate(
    { identity_key: identityKey },
    { $inc: { reputation_score: delta } },
    { new: true, upsert: false },
  )
    .select("reputation_score")
    .lean();

  if (!doc) return;

  const rawScore = (doc as unknown as { reputation_score: number }).reputation_score;
  const clamped = Math.max(0, rawScore);
  const tier = getReputationTier(clamped);

  await UserProfileModel.updateOne(
    { identity_key: identityKey },
    { $set: { reputation_score: clamped, reputation_tier: tier } },
  );
};

export type LeaderboardEntry = {
  identity_key: string;
  display_name: string;
  avatar_url: string;
  reputation_score: number;
  reputation_tier: string;
  forum_posts: number;
  forum_comments: number;
};

export const getReputationLeaderboard = async (limit = 20): Promise<LeaderboardEntry[]> => {
  await connectToDatabase();
  const docs = await UserProfileModel.find({ reputation_score: { $gt: 0 } })
    .select("identity_key display_name avatar_url reputation_score reputation_tier forum_posts forum_comments")
    .sort({ reputation_score: -1 })
    .limit(limit)
    .lean();

  return docs as unknown as LeaderboardEntry[];
};
