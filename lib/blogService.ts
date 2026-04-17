import { type SortOrder, isValidObjectId } from "mongoose";
import { BlogModel, type BlogDocument } from "@/models/Blog";
import { ViewEventModel } from "@/models/ViewEvent";
import { connectToDatabase } from "./mongodb";
import { resolveBlogCoverImage } from "./imageService";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Fields projected for list queries — omits heavy `content` to keep responses lean.
const LIST_PROJECTION = "-content";

/** Maximum body-word count for Inshorts-style briefs. 0 = unlimited. */
export const BLOG_MAX_WORDS = Number(process.env.BLOG_MAX_WORDS ?? 0);

/**
 * Count prose words in a markdown string.
 * Strips code blocks, inline code, markdown punctuation, and URLs before counting
 * so the limit applies to the readable body, not syntax characters.
 */
export const countWords = (markdown: string): number =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")          // fenced code blocks
    .replace(/`[^`]*`/g, " ")                  // inline code
    .replace(/https?:\/\/\S+/g, " ")           // URLs
    .replace(/[#>*_\-[\]()!|]/g, " ")          // markdown punctuation
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string | null;
  author: string;
  created_at: string;
  tags: string[];
  category: string;
  published: boolean;
  publish_at: string | null;
  upvote_count: number;
  downvote_count: number;
  view_count: number;
  word_count: number;
};

type ListParams = {
  category?: string;
  query?: string;
  sort?: "latest" | "most_viewed";
  limit?: number;
  page?: number;
};

type GetAllPostsParams = ListParams & {
  includeDrafts?: boolean;
};

export type BlogPostWriteInput = {
  title: string;
  slug?: string;
  content: string;
  excerpt: string;
  cover_image?: string | null;
  author: string;
  tags: string[];
  category: string;
  published: boolean;
  publish_at?: string | null;
};

const toBlogPost = (doc: BlogDocument): BlogPost => {
  const d = doc as unknown as {
    content?: string;
    publish_at?: Date | null;
    upvote_count?: number;
    downvote_count?: number;
    view_count?: number;
    word_count?: number;
  };
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    content: d.content ?? "",
    excerpt: doc.excerpt,
    cover_image: doc.cover_image ?? null,
    author: doc.author,
    created_at: doc.created_at.toISOString(),
    tags: doc.tags ?? [],
    category: doc.category,
    published: doc.published,
    publish_at: d.publish_at ? d.publish_at.toISOString() : null,
    upvote_count: d.upvote_count ?? 0,
    downvote_count: d.downvote_count ?? 0,
    view_count: d.view_count ?? 0,
    word_count: d.word_count ?? 0,
  };
};

const notDeleted = { deleted_at: null };

// Reusable clause: post is live (publish_at is null or has already passed).
const publishedNow = () => ({
  $or: [{ publish_at: null }, { publish_at: { $lte: new Date() } }],
});

const buildFilter = ({
  category,
  query,
  includeDrafts = false,
}: Pick<GetAllPostsParams, "category" | "query" | "includeDrafts">): Record<string, unknown> => {
  const filter: Record<string, unknown> = { ...notDeleted };
  if (!includeDrafts) {
    filter.published = true;
    // Exclude posts whose scheduled publish time hasn't arrived yet.
    Object.assign(filter, publishedNow());
  }
  if (category) filter.category = category;
  if (query) {
    const safe = query.trim().slice(0, 200);
    if (safe) {
      // Use MongoDB full-text search index for accurate, fast results.
      filter.$text = { $search: safe };
    }
  }
  return filter;
};

export const getAllPosts = async ({
  category,
  query,
  sort = "latest",
  limit = DEFAULT_LIMIT,
  page = 1,
  includeDrafts = false,
}: GetAllPostsParams = {}): Promise<BlogPost[]> => {
  await connectToDatabase();

  const clampedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * clampedLimit;
  const filter = buildFilter({ category, query, includeDrafts });

  // When a text query is active, rank by relevance score first.
  // Otherwise fall back to the user-chosen sort.
  const sortBy: Record<string, SortOrder | { $meta: string }> = filter.$text
    ? { score: { $meta: "textScore" }, created_at: -1 }
    : sort === "most_viewed"
      ? { view_count: -1, created_at: -1 }
      : { created_at: -1 };

  const docs = (await BlogModel.find(filter)
    .select(LIST_PROJECTION)
    .sort(sortBy as Record<string, SortOrder>)
    .skip(skip)
    .limit(clampedLimit)
    .lean()) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

export const getTotalPostCount = async ({
  category,
  query,
  includeDrafts = false,
}: Pick<GetAllPostsParams, "category" | "query" | "includeDrafts"> = {}): Promise<number> => {
  await connectToDatabase();
  const filter = buildFilter({ category, query, includeDrafts });
  return BlogModel.countDocuments(filter);
};

export const getPostById = async (id: string): Promise<BlogPost | null> => {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const doc = (await BlogModel.findOne({ _id: id, ...notDeleted }).lean()) as BlogDocument | null;
  return doc ? toBlogPost(doc) : null;
};

const normalizeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const generateUniqueSlug = async (
  rawTitleOrSlug: string,
  excludeId?: string,
): Promise<string> => {
  await connectToDatabase();
  const baseSlug = normalizeSlug(rawTitleOrSlug) || "untitled-post";

  // Try base, then base-2 through base-11, then a timestamp suffix as final fallback.
  const candidates = [
    baseSlug,
    ...Array.from({ length: 10 }, (_, i) => `${baseSlug}-${i + 2}`),
    `${baseSlug}-${Date.now()}`,
  ];

  for (const candidate of candidates) {
    const existing = await BlogModel.findOne({
      slug: candidate,
      ...notDeleted,
      ...(excludeId && isValidObjectId(excludeId) ? { _id: { $ne: excludeId } } : {}),
    })
      .select("_id")
      .lean();

    if (!existing) return candidate;
  }

  // Should never reach here — timestamp suffix guarantees uniqueness.
  throw new Error("Unable to generate a unique slug after multiple attempts.");
};

export const createPost = async (input: BlogPostWriteInput): Promise<BlogPost> => {
  await connectToDatabase();
  const uniqueSlug = await generateUniqueSlug(input.slug || input.title);
  const coverImage =
    (await resolveBlogCoverImage({
      title: input.title,
      category: input.category,
      tags: input.tags,
      existingCoverImage: input.cover_image ?? null,
    })) ?? null;

  const wordCount = countWords(input.content);
  if (BLOG_MAX_WORDS > 0 && wordCount > BLOG_MAX_WORDS) {
    throw new Error(
      `Blog content exceeds Inshorts word limit: ${wordCount} words (max ${BLOG_MAX_WORDS}).`,
    );
  }

  const doc = await BlogModel.create({
    title: input.title.trim(),
    slug: uniqueSlug,
    content: input.content,
    excerpt: input.excerpt.trim(),
    cover_image: coverImage,
    author: input.author.trim(),
    tags: input.tags,
    category: input.category.trim(),
    published: input.published,
    publish_at: input.publish_at ? new Date(input.publish_at) : null,
    word_count: wordCount,
    deleted_at: null,
  });

  return toBlogPost(doc.toObject() as unknown as BlogDocument);
};

export const updatePost = async (id: string, input: BlogPostWriteInput): Promise<BlogPost> => {
  if (!isValidObjectId(id)) throw new Error("Invalid post id.");
  await connectToDatabase();
  const uniqueSlug = await generateUniqueSlug(input.slug || input.title, id);

  // Snapshot the current version before overwriting (keep last 5).
  const current = (await BlogModel.findOne({ _id: id, ...notDeleted })
    .select("title content excerpt")
    .lean()) as { title?: string; content?: string; excerpt?: string } | null;

  if (current) {
    await BlogModel.updateOne(
      { _id: id },
      {
        $push: {
          versions: {
            $each: [{ title: current.title, content: current.content, excerpt: current.excerpt, saved_at: new Date() }],
            $slice: -5,
          },
        },
      },
    );
  }

  const coverImage =
    (await resolveBlogCoverImage({
      title: input.title,
      category: input.category,
      tags: input.tags,
      existingCoverImage: input.cover_image ?? null,
    })) ?? null;

  const wordCount = countWords(input.content);
  if (BLOG_MAX_WORDS > 0 && wordCount > BLOG_MAX_WORDS) {
    throw new Error(
      `Blog content exceeds Inshorts word limit: ${wordCount} words (max ${BLOG_MAX_WORDS}).`,
    );
  }

  const updated = (await BlogModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    {
      title: input.title.trim(),
      slug: uniqueSlug,
      content: input.content,
      excerpt: input.excerpt.trim(),
      cover_image: coverImage,
      author: input.author.trim(),
      tags: input.tags,
      category: input.category.trim(),
      published: input.published,
      publish_at: input.publish_at ? new Date(input.publish_at) : null,
      word_count: wordCount,
    },
    { new: true, runValidators: true },
  ).lean()) as BlogDocument | null;

  if (!updated) throw new Error("Blog post not found.");
  return toBlogPost(updated);
};

/** Soft-delete: sets deleted_at timestamp rather than removing the document. */
export const deletePost = async (id: string): Promise<void> => {
  if (!isValidObjectId(id)) throw new Error("Invalid post id.");
  await connectToDatabase();
  await BlogModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    { deleted_at: new Date() },
  ).lean();
};

export const getPostBySlug = async (
  slug: string,
  includeDrafts = false,
): Promise<BlogPost | null> => {
  await connectToDatabase();
  const doc = (await BlogModel.findOne({
    slug,
    ...notDeleted,
    ...(includeDrafts ? {} : { published: true, ...publishedNow() }),
  }).lean()) as BlogDocument | null;
  return doc ? toBlogPost(doc) : null;
};

export const getAllPublishedPosts = async (params: ListParams = {}): Promise<BlogPost[]> =>
  getAllPosts({ ...params, includeDrafts: false });

export const getPublishedPostBySlug = async (slug: string): Promise<BlogPost | null> =>
  getPostBySlug(slug, false);

export const getCategories = async (): Promise<string[]> => {
  await connectToDatabase();
  const categories = await BlogModel.distinct("category", { published: true, ...notDeleted, ...publishedNow() });
  return (categories as unknown as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
};

export const calculateReadingTime = (markdown: string): number => {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_\-[\]()!]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
};

export const getRelatedPosts = async (current: BlogPost, limit = 3): Promise<BlogPost[]> => {
  await connectToDatabase();

  const baseFilter = { published: true, _id: { $ne: current.id }, ...notDeleted, ...publishedNow() };

  const tagFilter = current.tags.length ? { tags: { $in: current.tags } } : null;
  const categoryFilter = { category: current.category };

  const docs = (await BlogModel.find({
    ...baseFilter,
    ...(tagFilter ?? categoryFilter),
  })
    .select(LIST_PROJECTION)
    .sort({ created_at: -1 })
    .limit(limit)
    .lean()) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

export type BlogStats = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalUpvotes: number;
  totalDownvotes: number;
  topByViews: BlogPost[];
  topByUpvotes: BlogPost[];
  recentPosts: BlogPost[];
  viewsByDay: Array<{ date: string; views: number }>;
  referrerSources: Array<{ source: string; views: number }>;
};

const toUtcDay = (date: Date): string => date.toISOString().slice(0, 10);

export const getStats = async (): Promise<BlogStats> => {
  await connectToDatabase();
  const now = new Date();
  const daysWindow = 14;
  const startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - (daysWindow - 1));

  // Single aggregation pipeline replaces four separate queries for the counters.
  type CountResult = {
    totalPosts: number;
    publishedPosts: number;
    totalViews: number;
    totalUpvotes: number;
    totalDownvotes: number;
  };

  const [aggregateResult, topByViewsDocs, topByUpvotesDocs, recentDocs, viewEventsAgg, referrerAgg] =
    await Promise.all([
    BlogModel.aggregate<CountResult>([
      { $match: { deleted_at: null } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          publishedPosts: { $sum: { $cond: ["$published", 1, 0] } },
          totalViews: { $sum: { $ifNull: ["$view_count", 0] } },
          totalUpvotes: { $sum: { $ifNull: ["$upvote_count", 0] } },
          totalDownvotes: { $sum: { $ifNull: ["$downvote_count", 0] } },
        },
      },
    ]),
    BlogModel.find({ ...notDeleted, published: true })
      .select(LIST_PROJECTION)
      .sort({ view_count: -1, created_at: -1 })
      .limit(10)
      .lean(),
    BlogModel.find({ ...notDeleted, published: true })
      .select(LIST_PROJECTION)
      .sort({ upvote_count: -1, created_at: -1 })
      .limit(10)
      .lean(),
    BlogModel.find({ ...notDeleted, published: true })
      .select(LIST_PROJECTION)
      .sort({ created_at: -1 })
      .limit(10)
      .lean(),
    ViewEventModel.aggregate<{ _id: string; count: number }>([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$created_at", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ViewEventModel.aggregate<{ _id: string; count: number }>([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: { $ifNull: ["$referrer_host", "direct"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    ]);

  const counts: CountResult = aggregateResult[0] ?? {
    totalPosts: 0,
    publishedPosts: 0,
    totalViews: 0,
    totalUpvotes: 0,
    totalDownvotes: 0,
  };

  const viewsByDateMap = new Map(viewEventsAgg.map((entry) => [entry._id, entry.count]));
  const viewsByDay = Array.from({ length: daysWindow }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const key = toUtcDay(date);
    return { date: key, views: viewsByDateMap.get(key) ?? 0 };
  });

  const referrerSources = referrerAgg.map((row) => ({
    source: row._id || "direct",
    views: row.count,
  }));

  return {
    totalPosts: counts.totalPosts,
    publishedPosts: counts.publishedPosts,
    draftPosts: counts.totalPosts - counts.publishedPosts,
    totalViews: counts.totalViews,
    totalUpvotes: counts.totalUpvotes,
    totalDownvotes: counts.totalDownvotes,
    topByViews: (topByViewsDocs as unknown as BlogDocument[]).map(toBlogPost),
    topByUpvotes: (topByUpvotesDocs as unknown as BlogDocument[]).map(toBlogPost),
    recentPosts: (recentDocs as unknown as BlogDocument[]).map(toBlogPost),
    viewsByDay,
    referrerSources,
  };
};

/** Atomically increment the upvote count for a post. Returns the new count. */
export const incrementUpvote = async (slug: string): Promise<number> => {
  await connectToDatabase();
  const updated = (await BlogModel.findOneAndUpdate(
    { slug, published: true, ...notDeleted },
    { $inc: { upvote_count: 1 } },
    { new: true },
  ).lean()) as BlogDocument | null;

  if (!updated) throw new Error("Post not found.");
  return (updated as unknown as { upvote_count: number }).upvote_count ?? 0;
};

/** Atomically increment the downvote count for a post. Returns the new count. */
export const incrementDownvote = async (slug: string): Promise<number> => {
  await connectToDatabase();
  const updated = (await BlogModel.findOneAndUpdate(
    { slug, published: true, ...notDeleted },
    { $inc: { downvote_count: 1 } },
    { new: true },
  ).lean()) as BlogDocument | null;

  if (!updated) throw new Error("Post not found.");
  return (updated as unknown as { downvote_count: number }).downvote_count ?? 0;
};

/** Atomically increment the view count for a published post. Returns new count or null when absent. */
export const incrementViewCount = async (slug: string): Promise<number | null> => {
  await connectToDatabase();
  const updated = (await BlogModel.findOneAndUpdate(
    { slug, published: true, ...notDeleted },
    { $inc: { view_count: 1 } },
    { new: true },
  ).lean()) as BlogDocument | null;

  return updated ? ((updated as unknown as { view_count: number }).view_count ?? 0) : null;
};

export const trackViewEvent = async ({
  slug,
  referrerHost,
  userAgent,
}: {
  slug: string;
  referrerHost?: string | null;
  userAgent?: string | null;
}): Promise<void> => {
  await connectToDatabase();
  const post = await BlogModel.findOne({ slug, published: true, ...notDeleted }).select("_id").lean();
  if (!post?._id) return;

  await ViewEventModel.create({
    slug,
    post_id: post._id,
    referrer_host: (referrerHost || "direct").trim().slice(0, 120),
    user_agent: (userAgent || "").trim().slice(0, 500),
  });
};

/**
 * Trending posts using HackerNews-style time-decay:
 *   score = (views + upvotes × 3) / (hours_since_publish + 2)^1.5
 * Only considers posts published within the last 30 days.
 */
export const getTrendingPosts = async (limit = 5): Promise<BlogPost[]> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const docs = (await BlogModel.aggregate([
    {
      $match: {
        published: true,
        deleted_at: null,
        $or: [{ publish_at: null }, { publish_at: { $lte: new Date() } }],
        created_at: { $gte: cutoff },
      },
    },
    {
      $addFields: {
        age_hours: {
          $divide: [{ $subtract: [new Date(), "$created_at"] }, 3_600_000],
        },
      },
    },
    {
      $addFields: {
        trending_score: {
          $divide: [
            {
              $add: [
                { $ifNull: ["$view_count", 0] },
                { $multiply: [{ $ifNull: ["$upvote_count", 0] }, 3] },
              ],
            },
            { $pow: [{ $add: ["$age_hours", 2] }, 1.5] },
          ],
        },
      },
    },
    { $sort: { trending_score: -1 } },
    { $limit: limit },
    { $project: { content: 0, versions: 0 } },
  ])) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

/**
 * Trending candidate pool — upgraded HackerNews formula.
 * Used by feedService as one of the 3 candidate buckets.
 * Returns up to `limit` posts from the last 14 days by trending score.
 */
export const getTrendingCandidates = async (limit = 30): Promise<BlogPost[]> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const docs = (await BlogModel.aggregate([
    {
      $match: {
        published: true,
        deleted_at: null,
        $or: [{ publish_at: null }, { publish_at: { $lte: new Date() } }],
        created_at: { $gte: cutoff },
      },
    },
    {
      $addFields: {
        age_hours: {
          $divide: [{ $subtract: [new Date(), "$created_at"] }, 3_600_000],
        },
      },
    },
    {
      $addFields: {
        trending_score: {
          $divide: [
            {
              $add: [
                { $ifNull: ["$view_count", 0] },
                { $multiply: [{ $ifNull: ["$upvote_count", 0] }, 3] },
              ],
            },
            { $pow: [{ $add: ["$age_hours", 2] }, 1.5] },
          ],
        },
      },
    },
    { $sort: { trending_score: -1 } },
    { $limit: limit },
    { $project: { content: 0, versions: 0 } },
  ])) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

/**
 * Exploration pool — random recent posts the user hasn't seen yet.
 * Uses MongoDB's $sample for true randomness.
 * Enables discovery and fights echo-chamber effects.
 */
export const getExplorationPosts = async (limit = 10): Promise<BlogPost[]> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // last 60 days

  const docs = (await BlogModel.aggregate([
    {
      $match: {
        published: true,
        deleted_at: null,
        $or: [{ publish_at: null }, { publish_at: { $lte: new Date() } }],
        created_at: { $gte: cutoff },
      },
    },
    { $sample: { size: limit } },
    { $project: { content: 0, versions: 0 } },
  ])) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

/**
 * Multi-window trending score:
 *   score_6h  = base * exp(-age_hours / 6)
 *   score_24h = base * exp(-age_hours / 24)
 *   score_7d  = base * exp(-age_hours / 168)
 *   trending_score = 0.5*score_6h + 0.3*score_24h + 0.2*score_7d
 */
export const getTrendingCandidatesMultiWindow = async (limit = 30): Promise<BlogPost[]> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const docs = (await BlogModel.aggregate([
    {
      $match: {
        published: true,
        deleted_at: null,
        $or: [{ publish_at: null }, { publish_at: { $lte: now } }],
        created_at: { $gte: cutoff },
      },
    },
    {
      $addFields: {
        age_hours: { $divide: [{ $subtract: [now, "$created_at"] }, 3_600_000] },
        base_engagement: {
          $add: [
            { $multiply: [{ $ifNull: ["$upvote_count", 0] }, 3] },
            { $multiply: [{ $ifNull: ["$comment_count", 0] }, 4] },
            { $multiply: [{ $ifNull: ["$view_count", 0] }, 0.2] },
          ],
        },
      },
    },
    {
      $addFields: {
        trend_6h: { $multiply: ["$base_engagement", { $exp: { $multiply: [-1 / 6, "$age_hours"] } }] },
        trend_24h: { $multiply: ["$base_engagement", { $exp: { $multiply: [-1 / 24, "$age_hours"] } }] },
        trend_7d: { $multiply: ["$base_engagement", { $exp: { $multiply: [-1 / 168, "$age_hours"] } }] },
      },
    },
    {
      $addFields: {
        trending_score: {
          $add: [
            { $multiply: ["$trend_6h", 0.5] },
            { $multiply: ["$trend_24h", 0.3] },
            { $multiply: ["$trend_7d", 0.2] },
          ],
        },
      },
    },
    { $sort: { trending_score: -1, created_at: -1 } },
    { $limit: limit },
    { $project: { content: 0, versions: 0 } },
  ])) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

/**
 * Promising exploration candidates:
 *  exploration_score = 0.6 * early_engagement + 0.4 * recency_boost
 *  early_engagement = ((upvotes*3)+(comments*4)) / max(1, views)
 *  recency_boost = exp(-age_hours / 18)
 */
export const getPromisingExplorationCandidates = async (limit = 12): Promise<BlogPost[]> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const now = new Date();

  const docs = (await BlogModel.aggregate([
    {
      $match: {
        published: true,
        deleted_at: null,
        $or: [{ publish_at: null }, { publish_at: { $lte: now } }],
        created_at: { $gte: cutoff },
      },
    },
    {
      $addFields: {
        age_hours: { $divide: [{ $subtract: [now, "$created_at"] }, 3_600_000] },
        views_safe: { $max: [1, { $ifNull: ["$view_count", 0] }] },
      },
    },
    {
      $addFields: {
        early_engagement: {
          $divide: [
            {
              $add: [
                { $multiply: [{ $ifNull: ["$upvote_count", 0] }, 3] },
                { $multiply: [{ $ifNull: ["$comment_count", 0] }, 4] },
              ],
            },
            "$views_safe",
          ],
        },
        recency_boost: { $exp: { $multiply: [-1 / 18, "$age_hours"] } },
      },
    },
    {
      $addFields: {
        exploration_score: {
          $add: [
            { $multiply: ["$early_engagement", 0.6] },
            { $multiply: ["$recency_boost", 0.4] },
          ],
        },
      },
    },
    { $sort: { exploration_score: -1, created_at: -1 } },
    { $limit: limit * 3 },
    { $sample: { size: limit } },
    { $project: { content: 0, versions: 0 } },
  ])) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
};

/**
 * Get all published post slugs, titles, and tags for internal linking /
 * recommendation lookups. Deliberately lightweight — no content field.
 */
export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  category: string;
  excerpt: string;
};

export const getAllPostSummaries = async (): Promise<PostSummary[]> => {
  await connectToDatabase();
  const docs = (await BlogModel.find({ published: true, ...notDeleted, ...publishedNow() })
    .select("slug title tags category excerpt")
    .sort({ created_at: -1 })
    .limit(500)
    .lean()) as unknown as Array<{
    _id: { toString(): string };
    slug: string;
    title: string;
    tags: string[];
    category: string;
    excerpt: string;
  }>;

  return docs.map((d) => ({
    id: d._id.toString(),
    slug: d.slug,
    title: d.title,
    tags: d.tags ?? [],
    category: d.category,
    excerpt: d.excerpt,
  }));
};
