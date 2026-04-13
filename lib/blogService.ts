import { cache } from "react";
import { isValidObjectId } from "mongoose";
import { BlogModel, type BlogDocument } from "@/models/Blog";
import { connectToDatabase } from "./mongodb";
const DEFAULT_LIMIT = 100;

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
};

type ListParams = {
  category?: string;
  limit?: number;
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
});

export const getAllPosts = cache(
  async ({
    category,
    limit = DEFAULT_LIMIT,
    includeDrafts = false,
  }: GetAllPostsParams = {}): Promise<BlogPost[]> => {
    await connectToDatabase();
    const filter: { published?: boolean; category?: string } = {};
    if (!includeDrafts) {
      filter.published = true;
    }
    if (category) {
      filter.category = category;
    }

    const docs = (await BlogModel.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()) as unknown as BlogDocument[];
    return docs.map(toBlogPost);
  },
);

export const getPostById = cache(async (id: string): Promise<BlogPost | null> => {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectToDatabase();
  const doc = (await BlogModel.findById(id).lean()) as BlogDocument | null;
  return doc ? toBlogPost(doc) : null;
});

const normalizeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const withRandomSuffix = (slug: string): string =>
  `${slug}-${Math.random().toString(36).slice(2, 8)}`;

export const generateUniqueSlug = async (
  rawTitleOrSlug: string,
  excludeId?: string,
): Promise<string> => {
  await connectToDatabase();
  const baseSlug = normalizeSlug(rawTitleOrSlug) || "untitled-post";
  let candidate = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await BlogModel.findOne({
      slug: candidate,
      ...(excludeId && isValidObjectId(excludeId) ? { _id: { $ne: excludeId } } : {}),
    })
      .select("_id")
      .lean();
    if (!existing) {
      return candidate;
    }

    candidate = withRandomSuffix(baseSlug);
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
    });

  return toBlogPost(doc.toObject() as BlogDocument);
};

export const updatePost = async (
  id: string,
  input: BlogPostWriteInput,
): Promise<BlogPost> => {
  if (!isValidObjectId(id)) {
    throw new Error("Invalid post id.");
  }
  await connectToDatabase();
  const uniqueSlug = await generateUniqueSlug(input.slug || input.title, id);

  const updated = (await BlogModel.findByIdAndUpdate(
    id,
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

  if (!updated) {
    throw new Error("Blog post not found.");
  }

  return toBlogPost(updated);
};

export const deletePost = async (id: string): Promise<void> => {
  if (!isValidObjectId(id)) {
    throw new Error("Invalid post id.");
  }
  await connectToDatabase();
  await BlogModel.findByIdAndDelete(id).lean();
};

export const getPostBySlug = cache(
  async (slug: string, includeDrafts = false): Promise<BlogPost | null> => {
    await connectToDatabase();
    const doc = (await BlogModel.findOne({
      slug,
      ...(includeDrafts ? {} : { published: true }),
    }).lean()) as BlogDocument | null;
    return doc ? toBlogPost(doc) : null;
  },
);

export const getAllPublishedPosts = cache(
  async ({ category, limit = DEFAULT_LIMIT }: ListParams = {}): Promise<BlogPost[]> => {
    return getAllPosts({ category, limit, includeDrafts: false });
  },
);

export const getPublishedPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    return getPostBySlug(slug, false);
  },
);

export const getCategories = cache(async (): Promise<string[]> => {
  await connectToDatabase();
  const categories = await BlogModel.distinct("category", { published: true });
  return categories.filter(Boolean).sort((a, b) => a.localeCompare(b));
});

export const calculateReadingTime = (markdown: string): number => {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_\-\[\]\(\)!]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
};

export const getRelatedPosts = async (
  current: BlogPost,
  limit = 3,
): Promise<BlogPost[]> => {
  await connectToDatabase();

  if (!current.tags.length) {
    const docs = (await BlogModel.find({
      published: true,
      _id: { $ne: current.id },
      category: current.category,
    })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()) as unknown as BlogDocument[];
    return docs.map(toBlogPost);
  }

  const docs = (await BlogModel.find({
    published: true,
    _id: { $ne: current.id },
    tags: { $in: current.tags },
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean()) as unknown as BlogDocument[];
  return docs.map(toBlogPost);
};
