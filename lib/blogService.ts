import { type SortOrder, isValidObjectId } from "mongoose";
import { BlogModel, type BlogDocument } from "@/models/Blog";
import { connectToDatabase } from "./mongodb";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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
  upvote_count: number;
  view_count: number;
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
};

const toBlogPost = (doc: BlogDocument): BlogPost => ({
  id: doc._id.toString(),
  title: doc.title,
  slug: doc.slug,
  content: doc.content,
  excerpt: doc.excerpt,
  cover_image: doc.cover_image ?? null,
  author: doc.author,
  created_at: doc.created_at.toISOString(),
  tags: doc.tags ?? [],
  category: doc.category,
  published: doc.published,
  upvote_count: doc.upvote_count ?? 0,
  view_count: doc.view_count ?? 0,
});

const notDeleted = { deleted_at: null };

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

  const filter: Record<string, unknown> = { ...notDeleted };
  if (!includeDrafts) filter.published = true;
  if (category) filter.category = category;
  if (query) {
    const safe = query.trim();
    if (safe) {
      const regex = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { excerpt: regex }, { tags: regex }, { content: regex }];
    }
  }

  const sortBy: Record<string, SortOrder> =
    sort === "most_viewed" ? { view_count: -1, created_at: -1 } : { created_at: -1 };

  const docs = (await BlogModel.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(clampedLimit)
    .lean()) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
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

  // Try the base slug first, then increment: base-2, base-3, …
  const candidates = [baseSlug, ...Array.from({ length: 10 }, (_, i) => `${baseSlug}-${i + 2}`)];

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

  throw new Error("Unable to generate a unique slug after multiple attempts.");
};

export const createPost = async (input: BlogPostWriteInput): Promise<BlogPost> => {
  await connectToDatabase();
  const uniqueSlug = await generateUniqueSlug(input.slug || input.title);

  const doc = await BlogModel.create({
    title: input.title.trim(),
    slug: uniqueSlug,
    content: input.content,
    excerpt: input.excerpt.trim(),
    cover_image: input.cover_image ?? null,
    author: input.author.trim(),
    tags: input.tags,
    category: input.category.trim(),
    published: input.published,
    deleted_at: null,
  });

  return toBlogPost(doc.toObject() as unknown as BlogDocument);
};

export const updatePost = async (id: string, input: BlogPostWriteInput): Promise<BlogPost> => {
  if (!isValidObjectId(id)) throw new Error("Invalid post id.");
  await connectToDatabase();
  const uniqueSlug = await generateUniqueSlug(input.slug || input.title, id);

  const updated = (await BlogModel.findOneAndUpdate(
    { _id: id, ...notDeleted },
    {
      title: input.title.trim(),
      slug: uniqueSlug,
      content: input.content,
      excerpt: input.excerpt.trim(),
      cover_image: input.cover_image ?? null,
      author: input.author.trim(),
      tags: input.tags,
      category: input.category.trim(),
      published: input.published,
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
    ...(includeDrafts ? {} : { published: true }),
  }).lean()) as BlogDocument | null;
  return doc ? toBlogPost(doc) : null;
};

export const getAllPublishedPosts = async (params: ListParams = {}): Promise<BlogPost[]> =>
  getAllPosts({ ...params, includeDrafts: false });

export const getPublishedPostBySlug = async (slug: string): Promise<BlogPost | null> =>
  getPostBySlug(slug, false);

export const getCategories = async (): Promise<string[]> => {
  await connectToDatabase();
  const categories = await BlogModel.distinct("category", { published: true, ...notDeleted });
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

  const baseFilter = { published: true, _id: { $ne: current.id }, ...notDeleted };

  const tagFilter = current.tags.length ? { tags: { $in: current.tags } } : null;
  const categoryFilter = { category: current.category };

  const docs = (await BlogModel.find({
    ...baseFilter,
    ...(tagFilter ?? categoryFilter),
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean()) as unknown as BlogDocument[];

  return docs.map(toBlogPost);
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
