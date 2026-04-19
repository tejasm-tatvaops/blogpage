/**
 * Reputation Engine
 * ─────────────────
 * Awards, deducts, and tracks points. All writes are additive — no schema
 * migrations required on existing UserProfile or Blog/Forum/Video models.
 *
 * POINT TABLE
 * ───────────
 *   article_view_received        : +1
 *   article_like_received        : +5
 *   article_comment_received     : +3
 *   article_share_received       : +4
 *   forum_post_created           : +5
 *   forum_answer_given           : +3
 *   forum_upvote_received        : +4
 *   forum_best_answer_awarded    : +15
 *   comment_upvote_received      : +2
 *   short_viewed                 : +1
 *   short_liked_received         : +5
 *   cross_content_link           : +8   (always base; multiplier applied by caller)
 *   cross_content_engagement     : base × 10
 *   peer_helpful_vote            : +6
 *   content_share                : +2
 *   badge_unlock_bonus           : varies
 *   anti_abuse_deduction         : negative
 *
 * CROSS-CONTENT 10× RULE
 * ──────────────────────
 *   Any engagement that crosses content types (blog→forum, forum→short,
 *   short→blog, etc.) gets a 10× multiplier on base_points.
 *   Detected automatically by passing source_content_type + target_content_type.
 *
 * ANTI-ABUSE
 * ──────────
 *   1. Same actor cannot trigger more than ABUSE_MAX_PER_ACTOR events of the
 *      same reason for the same target content in ABUSE_WINDOW_MS.
 *   2. Total per-identity daily point cap: DAILY_CAP points.
 *   3. Rapid-fire events (> BURST_LIMIT / BURST_WINDOW_MS) are silently dropped.
 *
 * BADGES
 * ──────
 *   Checked after every award. New badges are appended to UserProfile.forum_badges.
 *   Badge unlock grants a one-time bonus.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { UserProfileModel, getReputationTier } from "@/models/UserProfile";
import {
  ReputationEventModel,
  type RepEventReason,
  type RepContentType,
} from "@/models/ReputationEvent";

// ─── Point table ──────────────────────────────────────────────────────────────

const BASE_POINTS: Record<RepEventReason, number> = {
  article_view_received:      1,
  article_like_received:      5,
  article_comment_received:   3,
  article_share_received:     4,
  forum_post_created:         5,
  forum_answer_given:         3,
  forum_upvote_received:      4,
  forum_best_answer_awarded:  15,
  comment_upvote_received:    2,
  short_viewed:               1,
  short_liked_received:       5,
  cross_content_link:         8,
  cross_content_engagement:   5,  // multiplier will make it 50
  peer_helpful_vote:          6,
  content_share:              2,
  badge_unlock_bonus:         0,  // set per-badge below
  anti_abuse_deduction:       -10,
  manual_admin_adjustment:    0,  // passed in as override
};

// ─── Cross-content multiplier ─────────────────────────────────────────────────

const CROSS_CONTENT_MULTIPLIER = 10;

// ─── Anti-abuse constants ─────────────────────────────────────────────────────

const ABUSE_WINDOW_MS   = 60 * 60 * 1000; // 1 hour
const ABUSE_MAX_PER_ACTOR = 3;            // same actor, same reason, same target
const DAILY_CAP         = 500;            // max points earnable per user per day
const BURST_LIMIT       = 30;             // max events per identity per burst window
const BURST_WINDOW_MS   = 60_000;         // 1 minute

// In-process burst tracker (resets on cold start)
type BurstEntry = { count: number; windowStart: number };
const burstMap = new Map<string, BurstEntry>();

function isBursting(identityKey: string): boolean {
  const now = Date.now();
  const entry = burstMap.get(identityKey);
  if (!entry || now - entry.windowStart > BURST_WINDOW_MS) {
    burstMap.set(identityKey, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > BURST_LIMIT;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export type Badge = {
  id: string;
  label: string;
  description: string;
  bonus: number;
  /** Check if the user has earned this badge given their current profile */
  earned: (profile: {
    reputation_score: number;
    forum_posts: number;
    forum_comments: number;
    blog_likes: number;
  }) => boolean;
};

export const BADGES: Badge[] = [
  {
    id: "first_post",
    label: "First Post",
    description: "Published your first forum post",
    bonus: 10,
    earned: (p) => p.forum_posts >= 1,
  },
  {
    id: "conversationalist",
    label: "Conversationalist",
    description: "Left 10 thoughtful comments",
    bonus: 15,
    earned: (p) => p.forum_comments >= 10,
  },
  {
    id: "prolific",
    label: "Prolific Contributor",
    description: "Posted 25 forum discussions",
    bonus: 30,
    earned: (p) => p.forum_posts >= 25,
  },
  {
    id: "well_liked",
    label: "Well Liked",
    description: "Received 50 upvotes on your content",
    bonus: 25,
    earned: (p) => p.blog_likes >= 50,
  },
  {
    id: "rising_star",
    label: "Rising Star",
    description: "Reached 100 reputation points",
    bonus: 20,
    earned: (p) => p.reputation_score >= 100,
  },
  {
    id: "expert",
    label: "Expert",
    description: "Reached 500 reputation points",
    bonus: 50,
    earned: (p) => p.reputation_score >= 500,
  },
  {
    id: "elite",
    label: "Elite Member",
    description: "Reached 2000 reputation points — top tier",
    bonus: 100,
    earned: (p) => p.reputation_score >= 2000,
  },
  {
    id: "bridge_builder",
    label: "Bridge Builder",
    description: "Linked content across TatvaOps content types",
    bonus: 40,
    earned: () => false, // awarded explicitly via awardCrossContentBonus
  },
];

// ─── Badge checking ───────────────────────────────────────────────────────────

async function checkAndAwardBadges(identityKey: string): Promise<void> {
  const profile = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("reputation_score forum_posts forum_comments blog_likes forum_badges")
    .lean();

  if (!profile) return;

  const current = new Set<string>(
    (profile.forum_badges as string[] | undefined) ?? [],
  );

  const statsProfile = {
    reputation_score: (profile.reputation_score as number | undefined) ?? 0,
    forum_posts:      (profile.forum_posts as number | undefined) ?? 0,
    forum_comments:   (profile.forum_comments as number | undefined) ?? 0,
    blog_likes:       (profile.blog_likes as number | undefined) ?? 0,
  };

  const newBadges: string[] = [];

  for (const badge of BADGES) {
    if (current.has(badge.id)) continue;
    if (!badge.earned(statsProfile)) continue;
    newBadges.push(badge.id);
  }

  if (newBadges.length === 0) return;

  await UserProfileModel.updateOne(
    { identity_key: identityKey },
    { $addToSet: { forum_badges: { $each: newBadges } } },
  );

  // Award bonus points per new badge (fire-and-forget — won't loop because
  // badge_unlock_bonus doesn't re-trigger badge checks)
  for (const badgeId of newBadges) {
    const badge = BADGES.find((b) => b.id === badgeId);
    if (!badge || badge.bonus <= 0) continue;
    await awardPoints({
      identityKey,
      reason: "badge_unlock_bonus",
      note: `Badge unlocked: ${badge.label}`,
      pointsOverride: badge.bonus,
      skipBadgeCheck: true,
    });
  }
}

// ─── Anti-abuse: actor+reason+target dedup ───────────────────────────────────

async function isActorAbusing(
  actorKey: string,
  reason: RepEventReason,
  targetSlug: string | null | undefined,
): Promise<boolean> {
  if (!actorKey || !targetSlug) return false;

  const since = new Date(Date.now() - ABUSE_WINDOW_MS);
  const count = await ReputationEventModel.countDocuments({
    actor_identity_key: actorKey,
    reason,
    source_content_slug: targetSlug,
    created_at: { $gte: since },
  });

  return count >= ABUSE_MAX_PER_ACTOR;
}

// ─── Daily cap check ─────────────────────────────────────────────────────────

async function getDailyPointsEarned(identityKey: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await ReputationEventModel.aggregate([
    {
      $match: {
        identity_key: identityKey,
        awarded_points: { $gt: 0 },
        created_at: { $gte: startOfDay },
      },
    },
    { $group: { _id: null, total: { $sum: "$awarded_points" } } },
  ]);

  return (result[0]?.total as number | undefined) ?? 0;
}

// ─── Core award function ──────────────────────────────────────────────────────

export type AwardPointsOptions = {
  /** Identity key of the user who receives points */
  identityKey: string;
  reason: RepEventReason;

  /** Identity key of the user whose action triggered this award */
  actorIdentityKey?: string | null;

  /** Content slug that is the source of this event */
  sourceContentSlug?: string | null;
  sourceContentType?: RepContentType | null;

  /** If provided, cross-content multiplier applies automatically */
  targetContentType?: RepContentType | null;

  /** Override base points (for admin adjustments, badge bonuses, etc.) */
  pointsOverride?: number | null;

  /** Human-readable note for admin UI */
  note?: string | null;

  /** Internal: skip recursive badge check */
  skipBadgeCheck?: boolean;
};

/**
 * Award (or deduct) points from a user.
 * Returns the awarded_points value, or 0 if the event was blocked.
 */
export async function awardPoints(opts: AwardPointsOptions): Promise<number> {
  const {
    identityKey,
    reason,
    actorIdentityKey = null,
    sourceContentSlug = null,
    sourceContentType = null,
    targetContentType = null,
    pointsOverride = null,
    note = null,
    skipBadgeCheck = false,
  } = opts;

  // Guard: user must exist
  if (!identityKey) return 0;

  // Anti-abuse: burst suppression
  if (isBursting(identityKey)) return 0;

  // Anti-abuse: actor dedup
  if (actorIdentityKey && actorIdentityKey !== identityKey) {
    const abusing = await isActorAbusing(actorIdentityKey, reason, sourceContentSlug);
    if (abusing) return 0;
  }

  await connectToDatabase();

  const base = pointsOverride ?? BASE_POINTS[reason] ?? 0;

  // Cross-content multiplier
  const isCrossContent =
    !!sourceContentType &&
    !!targetContentType &&
    sourceContentType !== targetContentType;

  const multiplier = isCrossContent ? CROSS_CONTENT_MULTIPLIER : 1;
  const awarded = Math.round(base * multiplier);

  // Daily cap (only for positive awards)
  if (awarded > 0) {
    const earned = await getDailyPointsEarned(identityKey);
    if (earned >= DAILY_CAP) return 0;
  }

  // Write reputation event
  const event = await ReputationEventModel.create({
    identity_key: identityKey,
    reason,
    base_points: base,
    multiplier,
    awarded_points: awarded,
    source_content_type: sourceContentType,
    source_content_slug: sourceContentSlug,
    actor_identity_key: actorIdentityKey,
    note,
    is_cross_content: isCrossContent,
  });

  // Update UserProfile reputation_score
  const updated = await UserProfileModel.findOneAndUpdate(
    { identity_key: identityKey },
    { $inc: { reputation_score: awarded } },
    { new: true, upsert: false },
  )
    .select("reputation_score")
    .lean();

  if (updated) {
    const rawScore = (updated as unknown as { reputation_score: number }).reputation_score;
    const clamped = Math.max(0, rawScore);
    const tier = getReputationTier(clamped);

    await UserProfileModel.updateOne(
      { identity_key: identityKey },
      { $set: { reputation_score: clamped, reputation_tier: tier } },
    );

    // Patch running_total snapshot on the event
    await ReputationEventModel.updateOne(
      { _id: event._id },
      { $set: { running_total: clamped } },
    );
  }

  // Badge check
  if (!skipBadgeCheck) {
    void checkAndAwardBadges(identityKey).catch(() => null);
  }

  return awarded;
}

// ─── Convenience shortcuts ────────────────────────────────────────────────────

/** Called when a blog receives a like. Awards points to the blog author. */
export async function onBlogLikeReceived(
  authorIdentityKey: string,
  actorIdentityKey: string,
  blogSlug: string,
) {
  return awardPoints({
    identityKey: authorIdentityKey,
    reason: "article_like_received",
    actorIdentityKey,
    sourceContentSlug: blogSlug,
    sourceContentType: "blog",
  });
}

/** Called when a blog receives a comment. */
export async function onBlogCommentReceived(
  authorIdentityKey: string,
  actorIdentityKey: string,
  blogSlug: string,
) {
  return awardPoints({
    identityKey: authorIdentityKey,
    reason: "article_comment_received",
    actorIdentityKey,
    sourceContentSlug: blogSlug,
    sourceContentType: "blog",
  });
}

/** Called when a forum post receives an upvote. */
export async function onForumUpvoteReceived(
  authorIdentityKey: string,
  actorIdentityKey: string,
  forumSlug: string,
) {
  return awardPoints({
    identityKey: authorIdentityKey,
    reason: "forum_upvote_received",
    actorIdentityKey,
    sourceContentSlug: forumSlug,
    sourceContentType: "forum",
  });
}

/** Called when a user creates a forum post. */
export async function onForumPostCreated(identityKey: string, forumSlug: string) {
  return awardPoints({
    identityKey,
    reason: "forum_post_created",
    sourceContentSlug: forumSlug,
    sourceContentType: "forum",
  });
}

/** Called when a user posts a forum comment/answer. */
export async function onForumAnswerGiven(identityKey: string, forumSlug: string) {
  return awardPoints({
    identityKey,
    reason: "forum_answer_given",
    sourceContentSlug: forumSlug,
    sourceContentType: "forum",
  });
}

/** Called when a forum comment is marked best answer. */
export async function onBestAnswerAwarded(
  authorIdentityKey: string,
  forumSlug: string,
) {
  return awardPoints({
    identityKey: authorIdentityKey,
    reason: "forum_best_answer_awarded",
    sourceContentSlug: forumSlug,
    sourceContentType: "forum",
  });
}

/** Called when a short receives a like. */
export async function onShortLikeReceived(
  authorIdentityKey: string,
  actorIdentityKey: string,
  shortSlug: string,
) {
  return awardPoints({
    identityKey: authorIdentityKey,
    reason: "short_liked_received",
    actorIdentityKey,
    sourceContentSlug: shortSlug,
    sourceContentType: "short",
  });
}

/**
 * Cross-content link bonus — awarded when content links across types.
 * e.g. a blog that links a forum, a forum that references a short, etc.
 * The actor gets the "bridge_builder" badge on first cross-link.
 */
export async function onCrossContentLink(
  actorIdentityKey: string,
  sourceType: RepContentType,
  targetType: RepContentType,
  sourceSlug: string,
) {
  // Award bridge_builder badge if not already held
  const profile = await UserProfileModel.findOne({ identity_key: actorIdentityKey })
    .select("forum_badges")
    .lean();

  const hasBadge = ((profile?.forum_badges as string[] | undefined) ?? []).includes("bridge_builder");
  if (!hasBadge) {
    await UserProfileModel.updateOne(
      { identity_key: actorIdentityKey },
      { $addToSet: { forum_badges: "bridge_builder" } },
    );
    await awardPoints({
      identityKey: actorIdentityKey,
      reason: "badge_unlock_bonus",
      pointsOverride: 40,
      note: "Badge unlocked: Bridge Builder",
      skipBadgeCheck: true,
    });
  }

  return awardPoints({
    identityKey: actorIdentityKey,
    reason: "cross_content_link",
    sourceContentSlug: sourceSlug,
    sourceContentType: sourceType,
    targetContentType: targetType,
    note: `Linked ${sourceType} → ${targetType}`,
  });
}

// ─── History & leaderboard ────────────────────────────────────────────────────

export type ReputationHistoryEntry = {
  reason: string;
  awarded_points: number;
  running_total: number;
  source_content_slug: string | null;
  source_content_type: string | null;
  is_cross_content: boolean;
  note: string | null;
  created_at: Date;
};

export async function getReputationHistory(
  identityKey: string,
  limit = 50,
  offset = 0,
): Promise<ReputationHistoryEntry[]> {
  await connectToDatabase();
  const docs = await ReputationEventModel.find({ identity_key: identityKey })
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .select(
      "reason awarded_points running_total source_content_slug source_content_type is_cross_content note created_at",
    )
    .lean();

  return docs as unknown as ReputationHistoryEntry[];
}
