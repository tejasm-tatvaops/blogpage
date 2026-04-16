import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { ForumPostModel } from "@/models/ForumPost";
import { ForumVoteModel } from "@/models/ForumVote";
import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForumPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  author_name: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  comment_count: number;
  view_count: number;
  is_featured: boolean;
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
  upvote_count?: number;
  downvote_count?: number;
  score?: number;
  comment_count?: number;
  view_count?: number;
  is_featured?: boolean;
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
  upvote_count: doc.upvote_count ?? 0,
  downvote_count: doc.downvote_count ?? 0,
  score: doc.score ?? 0,
  comment_count: doc.comment_count ?? 0,
  view_count: doc.view_count ?? 0,
  is_featured: doc.is_featured ?? false,
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

const updateScoreFromDoc = async (postId: string, doc: ForumPostLean): Promise<void> => {
  const score = computeHotScore(
    doc.upvote_count ?? 0,
    doc.downvote_count ?? 0,
    doc.comment_count ?? 0,
    doc.created_at,
  );
  await ForumPostModel.updateOne({ _id: postId }, { score });
};

// ─── Slug helpers ─────────────────────────────────────────────────────────────

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);

const generateUniqueForumSlug = async (title: string): Promise<string> => {
  const base = generateSlug(title) || "post";
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await ForumPostModel.findOne({ slug: candidate }).select("_id").lean();
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
};

const generateExcerpt = (content: string): string => {
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
    hot: { score: -1, created_at: -1 },
    new: { created_at: -1 },
    top: { upvote_count: -1, created_at: -1 },
    discussed: { comment_count: -1, created_at: -1 },
  };

  const [docs, total] = await Promise.all([
    ForumPostModel.find(filter)
      .select(LIST_PROJECTION)
      .sort(sortMap[sort])
      .skip(skip)
      .limit(safeLimit)
      .lean() as unknown as Promise<ForumPostLean[]>,
    ForumPostModel.countDocuments(filter),
  ]);

  return {
    posts: docs.map(toForumPost),
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
  const excerpt = generateExcerpt(input.content);
  const now = new Date();
  const initialScore = computeHotScore(0, 0, 0, now);

  const doc = await ForumPostModel.create({
    title: input.title,
    slug,
    content: input.content,
    excerpt,
    tags: input.tags,
    author_name: input.author_name ?? "Anonymous",
    upvote_count: 0,
    downvote_count: 0,
    score: initialScore,
    comment_count: 0,
    view_count: 0,
    is_featured: false,
    best_comment_id: null,
    linked_blog_slug: input.linked_blog_slug ?? null,
    creator_fingerprint: input.creator_fingerprint ?? null,
    deleted_at: null,
  });

  logger.info({ slug, linked_blog_slug: input.linked_blog_slug }, "Forum post created");
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

// ─── Voting ───────────────────────────────────────────────────────────────────

export type VoteResult =
  | { ok: true; id: string; upvote_count: number; downvote_count: number; score: number }
  | { ok: false; reason: "not_found" | "already_voted" };

export const voteForumPost = async (
  slug: string,
  direction: "up" | "down",
  fingerprintId: string,
): Promise<VoteResult> => {
  await connectToDatabase();

  // Resolve post first to get its _id
  const post = (await ForumPostModel.findOne({ slug, ...notDeleted })
    .select("_id upvote_count downvote_count comment_count created_at")
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
    .select("_id upvote_count downvote_count comment_count created_at")
    .lean()) as unknown as ForumPostLean | null;

  if (!updated) return { ok: false, reason: "not_found" };

  const up = updated.upvote_count ?? 0;
  const down = updated.downvote_count ?? 0;
  const comments = updated.comment_count ?? 0;
  const newScore = computeHotScore(up, down, comments, updated.created_at);
  await ForumPostModel.updateOne({ _id: updated._id }, { score: newScore });

  return { ok: true, id: postId, upvote_count: up, downvote_count: down, score: newScore };
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

export const incrementForumCommentCount = async (postId: string): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  // Use findOneAndUpdate so we get the updated values in one round trip,
  // avoiding the separate findById read that recomputeScore used to do.
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: postId },
    { $inc: { comment_count: 1 } },
    { new: true },
  )
    .select("upvote_count downvote_count comment_count created_at")
    .lean()) as unknown as ForumPostLean | null;
  if (updated) await updateScoreFromDoc(postId, updated);
};

export const decrementForumCommentCount = async (postId: string): Promise<void> => {
  await connectToDatabase();
  if (!isValidObjectId(postId)) return;
  const updated = (await ForumPostModel.findOneAndUpdate(
    { _id: postId, comment_count: { $gt: 0 } },
    { $inc: { comment_count: -1 } },
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
    .select("view_count")
    .lean()) as unknown as ForumPostLean | null;
  return updated ? (updated.view_count ?? 0) : null;
};

// ─── Trending ─────────────────────────────────────────────────────────────────

export const getTrendingForumPosts = async (limit = 5): Promise<ForumPost[]> => {
  await connectToDatabase();
  const docs = (await ForumPostModel.find({ ...notDeleted })
    .select(LIST_PROJECTION)
    .sort({ score: -1, created_at: -1 })
    .limit(limit)
    .lean()) as unknown as ForumPostLean[];
  return docs.map(toForumPost);
};
