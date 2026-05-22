/**
 * Story Ranking Engine
 *
 * Signals (weighted):
 *   topic_affinity      0.35 — match between story tags and viewer interest_tags
 *   recency_decay       0.25 — exp decay; half-life ~8h
 *   completion_rate     0.15 — stories viewers finish deserve more reach
 *   engagement_score    0.15 — reactions + replies normalized
 *   reputation_boost    0.10 — author reputation tier amplifier
 *
 * Diversity enforcement:
 *   - Max 2 stories per identity_key in the visible rail window
 *   - Unseen stories always appear before seen
 *   - Anti-spam: author with >3 active stories shown max 2
 */

import type { Story } from "./storyService";
import { updateStoryRankingScore } from "./storyService";

// ─── Scoring components ───────────────────────────────────────────────────────

function recencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / 3_600_000;
  // Half-life 8h → exp(-ageHours / 11.5) keeps ~50% weight at 8h
  return Math.exp(-ageHours / 11.5);
}

function topicAffinity(
  storyTags: string[],
  interestVector: Record<string, number>,
): number {
  if (storyTags.length === 0 || Object.keys(interestVector).length === 0) return 0;
  const MAX_WEIGHT = 100;
  let total = 0;
  let matched = 0;
  for (const tag of storyTags) {
    const weight = interestVector[tag] ?? 0;
    total += weight;
    if (weight > 0) matched++;
  }
  const avgMatch = total / (storyTags.length * MAX_WEIGHT);
  const coverageBoost = matched / storyTags.length;
  return Math.min(1, avgMatch * 0.7 + coverageBoost * 0.3);
}

const TIER_SCORES: Record<string, number> = {
  elite: 1.0,
  expert: 0.75,
  contributor: 0.5,
  member: 0.25,
};

function reputationBoost(tier: string): number {
  return TIER_SCORES[tier] ?? 0.25;
}

function engagementScore(story: Story): number {
  // Normalize engagement — rough cap at 200 combined actions
  const combined = story.reactions_count + story.reply_count * 2;
  return Math.min(1, combined / 200);
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

export type ScoredStory = Story & { _score: number };

export function scoreStory(
  story: Story,
  interestVector: Record<string, number>,
): number {
  const affinity = topicAffinity(story.tags, interestVector);
  const recency = recencyScore(story.created_at);
  const completion = story.completion_rate;
  const engagement = engagementScore(story);
  const rep = reputationBoost(story.author_reputation_tier);

  return (
    affinity * 0.35 +
    recency * 0.25 +
    completion * 0.15 +
    engagement * 0.15 +
    rep * 0.10
  );
}

// ─── Feed ranking ─────────────────────────────────────────────────────────────

export type RankOptions = {
  interestVector: Record<string, number>;
  seenStoryIds: Set<string>;
  viewerIdentityKey: string;
  limit?: number;
};

export function rankStories(
  stories: Story[],
  opts: RankOptions,
): ScoredStory[] {
  const { interestVector, seenStoryIds, viewerIdentityKey, limit = 30 } = opts;

  const scored: ScoredStory[] = stories.map((s) => ({
    ...s,
    _score: scoreStory(s, interestVector),
  }));

  // Separate unseen and seen
  const unseen = scored.filter((s) => !seenStoryIds.has(s.id));
  const seen = scored.filter((s) => seenStoryIds.has(s.id));

  // Sort each group descending by score
  unseen.sort((a, b) => b._score - a._score);
  seen.sort((a, b) => b._score - a._score);

  const combined = [...unseen, ...seen];

  // Diversity enforcement: max 2 per author, viewer's own stories excluded from cap
  const authorCount: Record<string, number> = {};
  const diversified: ScoredStory[] = [];

  for (const story of combined) {
    if (story.identity_key === viewerIdentityKey) {
      // Skip viewer's own stories from the general feed — handled separately in rail
      continue;
    }
    const count = authorCount[story.identity_key] ?? 0;
    if (count >= 2) continue;
    authorCount[story.identity_key] = count + 1;
    diversified.push(story);
    if (diversified.length >= limit) break;
  }

  return diversified;
}

// ─── Persist ranking scores back to DB (background, best-effort) ──────────────

export async function persistRankingScores(stories: ScoredStory[]): Promise<void> {
  await Promise.allSettled(
    stories.map((s) => updateStoryRankingScore(s.id, s._score)),
  );
}
