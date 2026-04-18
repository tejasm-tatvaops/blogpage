import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { ForumPostModel } from "@/models/ForumPost";
import { ForumVoteModel } from "@/models/ForumVote";
import { ForumViewEventModel } from "@/models/ForumViewEvent";
import { CommentModel } from "@/models/Comment";
import { UserProfileModel } from "@/models/UserProfile";
import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { updateReputation, recordInterest } from "./personaService";
import { getContentQualityScore } from "./aiContentScore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForumPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  author_name: string;
  author_reputation_tier: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  comment_count: number;
  view_count: number;
  quality_score: number;
  engagement_score: number;
  final_rank_score: number;
  dwell_penalty_score: number;
  reply_depth_score: number;
  comment_quality_boost_score: number;
  gamification_score: number;
  badges: string[];
  is_featured: boolean;
  is_trending: boolean;
  best_comment_id: string | null;
  linked_blog_slug: string | null;
  creator_fingerprint: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Lean document shape returned by Mongoose — all projected-out fields are optional
 * so toForumPost handles both full and list-projection queries safely.
 */
type ForumPostLean = {
  _id: { toString(): string };
  title: string;
  slug: string;
  content?: string | null;
  excerpt: string;
  tags?: string[];
  author_name?: string;
  author_reputation_tier?: string;
  upvote_count?: number;
  downvote_count?: number;
  score?: number;
  comment_count?: number;
  view_count?: number;
  quality_score?: number;
  engagement_score?: number;
  final_rank_score?: number;
  dwell_penalty_score?: number;
  reply_depth_score?: number;
  comment_quality_boost_score?: number;
  gamification_score?: number;
  badges?: string[];
  is_featured?: boolean;
  is_trending?: boolean;
  best_comment_id?: string | null;
  linked_blog_slug?: string | null;
  creator_fingerprint?: string | null;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ForumFeedSort = "hot" | "new" | "top" | "discussed";

export type ForumPostInput = {
  title: string;
  content: string;
  tags: string[];
  author_name?: string;
  creator_fingerprint?: string;
  linked_blog_slug?: string | null;
};

// ─── Validation ───────────────────────────────────────────────────────────────

export const forumPostInputSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(300, "Title too long")
    .trim(),
  content: z
    .string()
    .min(20, "Content must be at least 20 characters")
    .max(50_000, "Content exceeds maximum length")
    .trim(),
  tags: z
    .array(z.string().max(50).trim())
    .max(10, "Too many tags")
    .default([])
    .transform((tags) => [...new Set(tags.filter(Boolean))]),
  author_name: z
    .string()
    .max(80, "Author name too long")
    .trim()
    .optional()
    .default("Anonymous"),
  creator_fingerprint: z.string().max(64).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notDeleted = { deleted_at: null };

const toForumPost = (doc: ForumPostLean): ForumPost => ({
  id: doc._id.toString(),
  title: doc.title,
  slug: doc.slug,
  content: doc.content ?? "",
  excerpt: doc.excerpt,
  tags: doc.tags ?? [],
  author_name: doc.author_name ?? "Anonymous",
  author_reputation_tier: doc.author_reputation_tier ?? "member",
  upvote_count: doc.upvote_count ?? 0,
  downvote_count: doc.downvote_count ?? 0,
  score: doc.score ?? 0,
  comment_count: doc.comment_count ?? 0,
  view_count: doc.view_count ?? 0,
  quality_score: doc.quality_score ?? 0,
  engagement_score: doc.engagement_score ?? 0,
  final_rank_score: doc.final_rank_score ?? 0,
  dwell_penalty_score: doc.dwell_penalty_score ?? 0,
  reply_depth_score: doc.reply_depth_score ?? 0,
  comment_quality_boost_score: doc.comment_quality_boost_score ?? 0,
  gamification_score: doc.gamification_score ?? 0,
  badges: doc.badges ?? [],
  is_featured: doc.is_featured ?? false,
  is_trending: doc.is_trending ?? false,
  best_comment_id: doc.best_comment_id ?? null,
  linked_blog_slug: doc.linked_blog_slug ?? null,
  creator_fingerprint: doc.creator_fingerprint ?? null,
  created_at: doc.created_at.toISOString(),
  updated_at: doc.updated_at.toISOString(),
});

const LIST_PROJECTION = "-content -creator_fingerprint";

// ─── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Reddit-style hot score.
 * score = log10(max(abs(net_votes + comments*2), 1)) + (unix_seconds / 45000)
 * Time component grows ~1 per 12.5 hours; log scale dampens vote manipulation.
 */
export const computeHotScore = (
  upvotes: number,
  downvotes: number,
  commentCount: number,
  createdAt: Date,
): number => {
  const netVotes = upvotes - downvotes;
  const weighted = netVotes + commentCount * 2;
  const logPart = Math.log10(Math.max(Math.abs(weighted), 1));
  const signedLog = weighted < 0 ? -logPart : logPart;
  const timePart = createdAt.getTime() / 1000 / 45_000;
  return signedLog + timePart;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const computeCommentDepthBoost = async (postId: string): Promise<number> => {
  const comments = await CommentModel.find({ post_id: postId, deleted_at: null })
    .select("content parent_comment_id")
    .sort({ created_at: -1 })
    .limit(120)
    .lean();
  if (!comments.length) return 0;
  const replies = comments.filter((c) => c.parent_comment_id);
  if (!replies.length) return 0;
  const avgReplyWords =
    replies.reduce((acc, c) => acc + String(c.content ?? "").trim().split(/\s+/).filter(Boolean).length, 0) /
    replies.length;
  const depthRatio = replies.length / comments.length;
  return clamp01(depthRatio * 0.6 + clamp01(avgReplyWords / 80) * 0.4);
};

const getEngagementIntegritySignals = async (
  postId: string,
): Promise<{ diversityFactor: number; repeatedActorPenalty: number; clusterLoopPenalty: number }> => {
  const [votes, comments] = await Promise.all([
    ForumVoteModel.find({ post_id: postId }).select("fingerprint_id").limit(300).lean(),
    CommentModel.find({ post_id: postId, deleted_at: null }).select("author_name").limit(300).lean(),
  ]);
  const actorFrequency = new Map<string, number>();
  for (const vote of votes) {
    const key = `v:${(vote.fingerprint_id ?? "").trim()}`;
    if (!key.endsWith(":")) actorFrequency.set(key, (actorFrequency.get(key) ?? 0) + 1);
  }
  for (const comment of comments) {
    const raw = (comment.author_name ?? "").trim().toLowerCase();
    if (!raw) continue;
    const key = `c:${raw}`;
    actorFrequency.set(key, (actorFrequency.get(key) ?? 0) + 1);
  }
  const totalInteractions = Math.max(1, votes.length + comments.length);
  const uniqueActors = actorFrequency.size;
  const diversityFactor = clamp01(uniqueActors / Math.sqrt(totalInteractions + 1));
  const maxShare = Math.max(0, ...[...actorFrequency.values()].map((v) => v / totalInteractions));
  const repeatedActorPenalty = clamp01((maxShare - 0.2) * 1.8);
  const topTwo = [...actorFrequency.values()].sort((a, b) => b - a).slice(0, 2);
  const topPairShare = topTwo.reduce((a, b) => a + b, 0) / totalInteractions;
  const clusterLoopPenalty = clamp01((topPairShare - 0.5) * 1.6);
  return { diversityFactor, repeatedActorPenalty, clusterLoopPenalty };
};

const computeEngagementScore = (
  doc: ForumPostLean,
  integrity: { diversityFactor: number; repeatedActorPenalty: number; clusterLoopPenalty: number },
): number => {
  const likes = doc.upvote_count ?? 0;
  const comments = doc.comment_count ?? 0;
  const views = Math.max(1, doc.view_count ?? 0);
  const dwellPenalty = doc.dwell_penalty_score ?? 0;
  const replyDepth = doc.reply_depth_score ?? 0;
  const raw = (likes * 2 + comments * 4 + replyDepth * 3 - dwellPenalty * 4) / Math.sqrt(views + 12);
  const diversityAdjusted = raw * (0.7 + integrity.diversityFactor * 0.3);
  const manipulationPenalty = integrity.repeatedActorPenalty * 0.28 + integrity.clusterLoopPenalty * 0.22;
  return clamp01(diversityAdjusted / 8 - manipulationPenalty);
};

const computeFinalRankScore = (doc: ForumPostLean): number => {
  const quality = clamp01(doc.quality_score ?? 0);
  const engagement = clamp01(doc.engagement_score ?? 0);
  const aiGate = quality < 0.3 ? 0.72 : 1;
  const ageHours = Math.max(0, (Date.now() - doc.created_at.getTime()) / 3_600_000);
  const decay = Math.exp(-ageHours / 120);
  const newPostBoost = ageHours <= 36 && quality >= 0.58 ? 1.08 : 1;
  const combined = quality * 0.5 + engagement * 0.5;
  return clamp01(combined * aiGate * decay * newPostBoost);
};

const computeGamificationScore = (doc: ForumPostLean): number => {
  const quality = doc.quality_score ?? 0;
  const engagement = doc.engagement_score ?? 0;
  const comments = doc.comment_count ?? 0;
  const dwellPenalty = doc.dwell_penalty_score ?? 0;
  let score = 0;
  if (quality >= 0.72) score += 10;
  if (engagement >= 0.62) score += 5;
  if (comments >= 8) score += 2;
  if (dwellPenalty >= 3) score -= 5;
  return score;
};

const derivePostBadges = (doc: ForumPostLean): string[] => {
  const badges: string[] = [];
  if ((doc.quality_score ?? 0) >= 0.72) badges.push("Top Thinker");
  if ((doc.engagement_score ?? 0) >= 0.62) badges.push("Hot Contributor");
  if ((doc.comment_count ?? 0) >= 8) badges.push("Discussion Starter");
  return badges;
};

const updateScoreFromDoc = async (postId: string, doc: ForumPostLean): Promise<void> => {
  const score = computeHotScore(
    doc.upvote_count ?? 0,
    doc.downvote_count ?? 0,
    doc.comment_count ?? 0,
    doc.created_at,
  );
  const [commentBoost, integrity] = await Promise.all([
    computeCommentDepthBoost(postId),
    getEngagementIntegritySignals(postId),
  ]);
  const quality =
    typeof doc.content === "string" && doc.content.trim()
      ? getContentQualityScore(doc.content, { commentDepthBoost: commentBoost })
      : clamp01((doc.quality_score ?? 0) + commentBoost * 0.06);
  const engagement = computeEngagementScore(doc, integrity);
  const scoreDoc = {
    ...doc,
    engagement_score: engagement,
    quality_score: quality,
    comment_quality_boost_score: commentBoost,
  };
  const finalRank = computeFinalRankScore(scoreDoc);
  const gamification = computeGamificationScore(scoreDoc);
  const badges = derivePostBadges(scoreDoc);
  await ForumPostModel.updateOne(
    { _id: postId },
    {
      score,
      quality_score: quality,
      engagement_score: engagement,
      final_rank_score: finalRank,
      comment_quality_boost_score: commentBoost,
      gamification_score: gamification,
      badges,
    },
  );
};

const updateAuthorGamification = async ({
  creatorFingerprint,
  qualityScore,
  engagementScore,
  commentCount,
}: {
  creatorFingerprint: string;
  qualityScore: number;
  engagementScore: number;
  commentCount: number;
}): Promise<void> => {
  const identityKey = `fp:${creatorFingerprint}`;
  const now = new Date();
  const profile = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("forum_badges forum_posting_streak_days forum_quality_streak_days forum_last_posted_at")
    .lean();

  const prevPosted = profile?.forum_last_posted_at ? new Date(profile.forum_last_posted_at as unknown as Date) : null;
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDiff = prevPosted ? Math.floor((now.getTime() - prevPosted.getTime()) / dayMs) : null;
  const postingStreak =
    dayDiff === 1
      ? (profile?.forum_posting_streak_days ?? 0) + 1
      : dayDiff === 0
        ? Math.max(1, profile?.forum_posting_streak_days ?? 1)
        : 1;
  const qualityStreak =
    qualityScore >= 0.72
      ? (dayDiff === 1 || dayDiff === 0 ? (profile?.forum_quality_streak_days ?? 0) + 1 : 1)
      : 0;

  const badges = new Set<string>(profile?.forum_badges ?? []);
  if (qualityScore >= 0.72) badges.add("Top Thinker");
  if (engagementScore >= 0.62) badges.add("Hot Contributor");
  if (commentCount >= 8) badges.add("Discussion Starter");

  await UserProfileModel.updateOne(
    { identity_key: identityKey },
    {
      $set: {
        forum_badges: [...badges],
        forum_posting_streak_days: postingStreak,
        forum_quality_streak_days: qualityStreak,
        forum_last_posted_at: now,
      },
    },
  );
};

// ─── Slug helpers ─────────────────────────────────────────────────────────────

export const generateForumSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);

const generateUniqueForumSlug = async (title: string): Promise<string> => {
  const base = generateForumSlug(title) || "post";
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await ForumPostModel.findOne({ slug: candidate }).select("_id").lean();
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
};

export const generateForumExcerpt = (content: string): string => {
  const plain = content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/`[^`]+`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
  return plain.slice(0, 280) + (plain.length > 280 ? "…" : "");
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export type GetForumPostsParams = {
  sort?: ForumFeedSort;
  page?: number;
  limit?: number;
  tag?: string;
  query?: string;
};

export type ForumFeedResult = {
  posts: ForumPost[];
  total: number;
  page: number;
  totalPages: number;
};

const applyFairExposureWindow = (docs: ForumPostLean[], windowSize: number): ForumPostLean[] => {
  const selected: ForumPostLean[] = [];
  const authorCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const exposureCapPerAuthor = Math.max(2, Math.floor(windowSize / 4));
  const windowCandidates = docs.slice(0, Math.max(windowSize * 5, 80));

  for (const candidate of windowCandidates) {
    if (selected.length >= windowSize) break;
    const author = (candidate.author_name ?? "anonymous").toLowerCase();
    const currentAuthorCount = authorCounts.get(author) ?? 0;
    if (currentAuthorCount >= exposureCapPerAuthor) continue;

    const quality = candidate.quality_score ?? 0;
    const ageHours = Math.max(0, (Date.now() - candidate.created_at.getTime()) / 3_600_000);
    const newAuthorBoost = currentAuthorCount === 0 && quality >= 0.58 && ageHours <= 36 ? 0.08 : 0;
    const repeatedExposurePenalty = currentAuthorCount * 0.07;
    const primaryTag = (candidate.tags?.[0] ?? "general").toLowerCase();
    const tagPenalty = (tagCounts.get(primaryTag) ?? 0) * 0.04;
    const adjustedScore = (candidate.final_rank_score ?? 0) + newAuthorBoost - repeatedExposurePenalty - tagPenalty;

    if (adjustedScore < 0.08 && selected.length > windowSize * 0.5) continue;
    selected.push({ ...candidate, final_rank_score: adjustedScore });
    authorCounts.set(author, currentAuthorCount + 1);
    tagCounts.set(primaryTag, (tagCounts.get(primaryTag) ?? 0) + 1);
  }

  return selected.sort((a, b) => (b.final_rank_score ?? 0) - (a.final_rank_score ?? 0));
};

export const getForumPosts = async ({
  sort = "hot",
  page = 1,
  limit = 20,
  tag,
  query,
}: GetForumPostsParams = {}): Promise<ForumFeedResult> => {
  await connectToDatabase();

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;

  const filter: Record<string, unknown> = { ...notDeleted };
  if (tag) filter.tags = tag;
  const trimmedQuery = query?.trim();
  if (trimmedQuery) {
    filter.title = { $regex: trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const sortMap: Record<ForumFeedSort, Record<string, 1 | -1>> = {
    hot: { final_rank_score: -1, score: -1, created_at: -1 },
    new: { created_at: -1 },
    top: { upvote_count: -1, created_at: -1 },
    discussed: { comment_count: -1, created_at: -1 },
  };

  const [docs, total] = await Promise.all([
    sort === "hot"
      ? (ForumPostModel.find(filter)
          .select(LIST_PROJECTION)
          .sort(sortMap[sort])
          .limit(Math.min(400, safePage * safeLimit * 6))
          .lean() as unknown as Promise<ForumPostLean[]>)
      : (ForumPostModel.find(filter)
          .select(LIST_PROJECTION)
          .sort(sortMap[sort])
          .skip(skip)
          .limit(safeLimit)
          .lean() as unknown as Promise<ForumPostLean[]>),
    ForumPostModel.countDocuments(filter),
  ]);

  const rankedDocs =
    sort === "hot"
      ? applyFairExposureWindow(docs, Math.max(safePage * safeLimit, safeLimit))
      : docs;
  const pagedDocs = sort === "hot" ? rankedDocs.slice(skip, skip + safeLimit) : rankedDocs;

  return {
    posts: pagedDocs.map(toForumPost),
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  };
};

export const getForumPostBySlug = async (slug: string): Promise<ForumPost | null> => {
  await connectToDatabase();
  const doc = (await ForumPostModel.findOne({
    slug,
    ...notDeleted,
  }).lean()) as unknown as ForumPostLean | null;
  return doc ? toForumPost(doc) : null;
};

export const getForumPostById = async (id: string): Promise<ForumPost | null> => {
  await connectToDatabase();
  if (!isValidObjectId(id)) return null;
  const doc = (await ForumPostModel.findOne({
    _id: id,
    ...notDeleted,
  }).lean()) as unknown as ForumPostLean | null;
  return doc ? toForumPost(doc) : null;
};

export const getForumPostByBlogSlug = async (blogSlug: string): Promise<ForumPost | null> => {
  await connectToDatabase();
  const doc = (await ForumPostModel.findOne({
    linked_blog_slug: blogSlug,
    ...notDeleted,
  })
    .select(LIST_PROJECTION)
    .lean()) as unknown as ForumPostLean | null;
  return doc ? toForumPost(doc) : null;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createForumPost = async (input: ForumPostInput): Promise<ForumPost> => {
  await connectToDatabase();
  const slug = await generateUniqueForumSlug(input.title);
  const excerpt = generateForumExcerpt(input.content);
  const now = new Date();
  const qualityScore = getContentQualityScore(input.content);
  const initialScore = computeHotScore(0, 0, 0, now);
  const engagementScore = 0;
  const authorTierDoc = input.creator_fingerprint
    ? await UserProfileModel.findOne({ identity_key: `fp:${input.creator_fingerprint}` })
      .select("reputation_tier")
      .lean()
    : null;
  const authorTier = (authorTierDoc?.reputation_tier as string | undefined) ?? "member";
  const finalRankScore = computeFinalRankScore({
    _id: { toString: () => "new" },
    title: input.title,
    slug,
    excerpt,
    created_at: now,
    updated_at: now,
    quality_score: qualityScore,
    engagement_score: engagementScore,
  });
  const gamificationScore = computeGamificationScore({
    _id: { toString: () => "new" },
    title: input.title,
    slug,
    excerpt,
    created_at: now,
    updated_at: now,
    quality_score: qualityScore,
    engagement_score: engagementScore,
    comment_count: 0,
    dwell_penalty_score: 0,
  });
  const badges = derivePostBadges({
    _id: { toString: () => "new" },
    title: input.title,
    slug,
    excerpt,
    created_at: now,
    updated_at: now,
    quality_score: qualityScore,
    engagement_score: engagementScore,
    comment_count: 0,
  });

  const doc = await ForumPostModel.create({
    title: input.title,
    slug,
    content: input.content,
    excerpt,
    tags: input.tags,
    author_name: input.author_name ?? "Anonymous",
    author_reputation_tier: authorTier,
    upvote_count: 0,
    downvote_count: 0,
    score: initialScore,
    comment_count: 0,
    view_count: 0,
    quality_score: qualityScore,
    engagement_score: engagementScore,
    final_rank_score: finalRankScore,
    dwell_penalty_score: 0,
    reply_depth_score: 0,
    comment_quality_boost_score: 0,
    gamification_score: gamificationScore,
    badges,
    is_featured: false,
    is_trending: false,
    best_comment_id: null,
    linked_blog_slug: input.linked_blog_slug ?? null,
    creator_fingerprint: input.creator_fingerprint ?? null,
    deleted_at: null,
  });

  logger.info({ slug, linked_blog_slug: input.linked_blog_slug }, "Forum post created");

  // Reputation: +5 for creating a forum post
  if (input.creator_fingerprint) {
    const qualityRepBoost = qualityScore >= 0.72 ? 12 : qualityScore >= 0.58 ? 8 : qualityScore < 0.28 ? -3 : 4;
    void updateReputation(`fp:${input.creator_fingerprint}`, qualityRepBoost);
    void updateAuthorGamification({
      creatorFingerprint: input.creator_fingerprint,
      qualityScore,
      engagementScore,
      commentCount: 0,
    });
    void recordInterest({
      identityKey: `fp:${input.creator_fingerprint}`,
      tags: input.tags,
      action: "forum_post",
    });
  }

  return toForumPost(doc.toObject() as unknown as ForumPostLean);
};

/**
 * Find-or-create a forum thread linked to a blog post.
 * Safe to call on every blog page render — idempotent.
 * Handles concurrent creation races: if two calls both pass the null check
 * and one wins the insert, the loser catches the duplicate key error and
 * returns the winner's record instead of throwing.
 */
export const ensureForumPostForBlog = async (
  blogSlug: string,
  blogTitle: string,
): Promise<ForumPost> => {
  await connectToDatabase();

  const existing = await getForumPostByBlogSlug(blogSlug);
  if (existing) return existing;

  try {
    return await createForumPost({
      title: `Discussion: ${blogTitle}`,
      content: `This is the discussion thread for the TatvaOps blog post: **${blogTitle}**.\n\nShare your thoughts, questions, or insights about this article below.`,
      tags: ["discussion", "blog"],
      author_name: "TatvaOps",
      linked_blog_slug: blogSlug,
    });
  } catch (err: unknown) {
    // Concurrent call won the race — fetch and return the existing record
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      const raced = await getForumPostByBlogSlug(blogSlug);
      if (raced) return raced;
    }
    throw err;
  }
};

export const deleteForumPost = async (id: string): Promise<boolean> => {
  await connectToDatabase();
  if (!isValidObjectId(id)) return false;
  const result = await ForumPostModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    { deleted_at: new Date() },
    { new: false },
  )
    .select("_id")
    .lean();
  return Boolean(result);
};

export const setForumPostFeatured = async (id: string, isFeatured: boolean): Promise<ForumPost | null> => {
  await connectToDatabase();
  if (!isValidObjectId(id)) return null;
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    { is_featured: isFeatured },
    { new: true },
  ).lean()) as unknown as ForumPostLean | null;
  return updated ? toForumPost(updated) : null;
};

export const recomputeForumQualityScore = async (postId: string): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  const doc = (await ForumPostModel.findOne({ _id: postId, ...notDeleted })
    .select("content upvote_count downvote_count comment_count created_at view_count dwell_penalty_score reply_depth_score")
    .lean()) as unknown as ForumPostLean | null;
  if (!doc || !doc.content) return;
  const commentBoost = await computeCommentDepthBoost(postId);
  const qualityScore = getContentQualityScore(doc.content, { commentDepthBoost: commentBoost });
  await ForumPostModel.updateOne({
    _id: postId,
  }, { $set: { quality_score: qualityScore, comment_quality_boost_score: commentBoost } });
  await updateScoreFromDoc(postId, { ...doc, quality_score: qualityScore, comment_quality_boost_score: commentBoost });
};

// ─── Voting ───────────────────────────────────────────────────────────────────

export type VoteResult =
  | {
      ok: true;
      id: string;
      upvote_count: number;
      downvote_count: number;
      score: number;
      creator_fingerprint: string | null;
    }
  | { ok: false; reason: "not_found" | "already_voted" };

export const voteForumPost = async (
  slug: string,
  direction: "up" | "down",
  fingerprintId: string,
): Promise<VoteResult> => {
  await connectToDatabase();

  // Resolve post first to get its _id
  const post = (await ForumPostModel.findOne({ slug, ...notDeleted })
    .select("_id upvote_count downvote_count comment_count created_at creator_fingerprint")
    .lean()) as unknown as ForumPostLean | null;
  if (!post) return { ok: false, reason: "not_found" };

  const postId = post._id.toString();

  // Dedup check: one vote per fingerprint per post
  try {
    await ForumVoteModel.create({ post_id: postId, fingerprint_id: fingerprintId, direction });
  } catch (err: unknown) {
    // MongoDB duplicate key error code 11000
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return { ok: false, reason: "already_voted" };
    }
    throw err;
  }

  const field = direction === "up" ? "upvote_count" : "downvote_count";
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: post._id, ...notDeleted },
    { $inc: { [field]: 1 } },
    { new: true },
  )
    .select("_id upvote_count downvote_count comment_count created_at creator_fingerprint")
    .lean()) as unknown as ForumPostLean | null;

  if (!updated) return { ok: false, reason: "not_found" };

  const up = updated.upvote_count ?? 0;
  const down = updated.downvote_count ?? 0;
  await updateScoreFromDoc(postId, updated);
  const refreshed = (await ForumPostModel.findById(updated._id)
    .select("score quality_score engagement_score comment_count")
    .lean()) as unknown as ForumPostLean | null;
  const newScore = refreshed?.score ?? computeHotScore(up, down, updated.comment_count ?? 0, updated.created_at);

  // Reputation: receiving an upvote = +2 for post author; downvote = -1
  const authorFingerprint = updated.creator_fingerprint ?? null;
  if (authorFingerprint) {
    void updateReputation(`fp:${authorFingerprint}`, direction === "up" ? 2 : -1);
    if (refreshed) {
      void updateAuthorGamification({
        creatorFingerprint: authorFingerprint,
        qualityScore: refreshed.quality_score ?? 0,
        engagementScore: refreshed.engagement_score ?? 0,
        commentCount: refreshed.comment_count ?? 0,
      });
    }
  }
  // Voter gets +1 for participating
  void updateReputation(`fp:${fingerprintId}`, 1);

  return {
    ok: true,
    id: postId,
    upvote_count: up,
    downvote_count: down,
    score: newScore,
    creator_fingerprint: updated.creator_fingerprint ?? null,
  };
};

// ─── Best Answer ──────────────────────────────────────────────────────────────

export const setBestAnswer = async (
  slug: string,
  commentId: string,
  fingerprintId: string,
): Promise<{ ok: boolean; reason?: string }> => {
  await connectToDatabase();

  const post = (await ForumPostModel.findOne({ slug, ...notDeleted })
    .select("_id creator_fingerprint")
    .lean()) as unknown as ForumPostLean | null;

  if (!post) return { ok: false, reason: "not_found" };

  // Only the original poster can mark best answer
  if (post.creator_fingerprint && post.creator_fingerprint !== fingerprintId) {
    return { ok: false, reason: "unauthorized" };
  }

  await ForumPostModel.updateOne(
    { _id: post._id },
    { best_comment_id: commentId === "clear" ? null : commentId },
  );

  return { ok: true };
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const incrementForumCommentCount = async (
  postId: string,
  commenterIdentityKey?: string,
): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: postId },
    { $inc: { comment_count: 1, reply_depth_score: 0.45 } },
    { new: true },
  )
    .select("upvote_count downvote_count comment_count created_at quality_score engagement_score creator_fingerprint")
    .lean()) as unknown as ForumPostLean | null;
  if (updated) {
    await updateScoreFromDoc(postId, updated);
    if (updated.creator_fingerprint) {
      void updateAuthorGamification({
        creatorFingerprint: updated.creator_fingerprint,
        qualityScore: updated.quality_score ?? 0,
        engagementScore: updated.engagement_score ?? 0,
        commentCount: updated.comment_count ?? 0,
      });
    }
  }

  // Reputation: +3 for adding a forum comment
  if (commenterIdentityKey) {
    void updateReputation(commenterIdentityKey, 3);
  }
};

export const decrementForumCommentCount = async (postId: string): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: postId, comment_count: { $gt: 0 } },
    { $inc: { comment_count: -1, reply_depth_score: -0.45 } },
    { new: true },
  )
    .select("upvote_count downvote_count comment_count created_at")
    .lean()) as unknown as ForumPostLean | null;
  if (updated) await updateScoreFromDoc(postId, updated);
};

// ─── Views ────────────────────────────────────────────────────────────────────

export const incrementForumViewCount = async (slug: string): Promise<number | null> => {
  await connectToDatabase();
  const updated = (await ForumPostModel.findOneAndUpdate(
    { slug, ...notDeleted },
    { $inc: { view_count: 1 } },
    { new: true },
  )
    .select("view_count upvote_count downvote_count comment_count created_at quality_score engagement_score")
    .lean()) as unknown as ForumPostLean | null;
  if (updated) {
    await updateScoreFromDoc(updated._id.toString(), updated);
  }
  return updated ? (updated.view_count ?? 0) : null;
};

export const registerForumDwellSignal = async ({
  slug,
  dwellMs,
  isSkip,
}: {
  slug: string;
  dwellMs?: number;
  isSkip?: boolean;
}): Promise<void> => {
  await connectToDatabase();
  const lowDwell = typeof dwellMs === "number" && dwellMs > 0 && dwellMs < 4500;
  if (!lowDwell && !isSkip) return;
  const penaltyDelta = (lowDwell ? 0.9 : 0) + (isSkip ? 1.2 : 0);
  const updated = (await ForumPostModel.findOneAndUpdate(
    { slug, ...notDeleted },
    { $inc: { dwell_penalty_score: penaltyDelta } },
    { new: true },
  )
    .select("upvote_count downvote_count comment_count created_at quality_score engagement_score")
    .lean()) as unknown as ForumPostLean | null;
  if (updated) {
    await updateScoreFromDoc(updated._id.toString(), updated);
  }
};

export const trackForumViewEvent = async ({
  slug,
  postId,
  referrerHost,
  userAgent,
}: {
  slug: string;
  postId: string;
  referrerHost?: string | null;
  userAgent?: string | null;
}): Promise<void> => {
  await connectToDatabase();
  await ForumViewEventModel.create({
    forum_slug: slug,
    post_id: postId,
    referrer_host: (referrerHost || "direct").trim().slice(0, 120),
    user_agent: (userAgent || "").trim().slice(0, 500),
  });
};

// ─── Trending ─────────────────────────────────────────────────────────────────

/**
 * Fetch forum posts that share tags with a given post (cross-linking use-case).
 * Returns up to `limit` posts ordered by quality rank.
 * Pass `excludeSlug` to skip a post already shown via a direct link.
 */
export const getRelatedForumPosts = async (
  tags: string[],
  excludeSlug?: string,
  limit = 3,
): Promise<ForumPost[]> => {
  await connectToDatabase();
  if (!tags.length) return [];

  const filter: Record<string, unknown> = { tags: { $in: tags }, ...notDeleted };
  if (excludeSlug) filter.slug = { $ne: excludeSlug };

  const docs = (await ForumPostModel.find(filter)
    .select(LIST_PROJECTION)
    .sort({ final_rank_score: -1, created_at: -1 })
    .limit(limit)
    .lean()) as unknown as ForumPostLean[];
  return docs.map(toForumPost);
};

/**
 * Returns all distinct tags across non-deleted forum posts, sorted alphabetically.
 * Used to generate static params for tag hub pages.
 */
export const getAllForumTags = async (): Promise<string[]> => {
  await connectToDatabase();
  const tags = (await ForumPostModel.distinct("tags", { ...notDeleted })) as unknown as string[];
  return tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

export const getTrendingForumPosts = async (limit = 5): Promise<ForumPost[]> => {
  await connectToDatabase();
  const docs = (await ForumPostModel.find({ ...notDeleted, is_trending: true })
    .select(LIST_PROJECTION)
    .sort({ final_rank_score: -1, score: -1, created_at: -1 })
    .limit(limit)
    .lean()) as unknown as ForumPostLean[];
  return docs.map(toForumPost);
};

export const setForumPostTrending = async (postId: string, trending: boolean): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  await ForumPostModel.updateOne({ _id: postId }, { is_trending: trending });
};
