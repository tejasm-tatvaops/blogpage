/**
 * Video Service — CRUD, feed ranking, and content-derived recommendations
 *
 * Design principles:
 *  - Never surface a VideoPost without a valid videoUrl or youtubeVideoId.
 *  - Feed ranking mirrors the blog feed: hot score, recency, tag relevance.
 *  - Content-derived recommendations use a pure mapping (no I/O) so that
 *    construction-topic tags map to curated YouTube search query suggestions.
 *    Admins use these suggestions to find and add real video content.
 */

import { connectToDatabase } from "./mongodb";
import { VideoPostModel, type VideoPost, type IVideoPost } from "@/models/VideoPost";
import type { FilterQuery, SortOrder } from "mongoose";

// ─── Type for write operations ────────────────────────────────────────────────

export type VideoPostWriteInput = {
  title: string;
  slug?: string;
  sourceType: "youtube" | "uploaded" | "curated";
  youtubeVideoId?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  animatedPreviewUrl?: string | null;
  durationSeconds?: number | null;
  shortCaption: string;
  transcript?: string | null;
  summary?: string | null;
  tags?: string[];
  category: string;
  linkedBlogSlug?: string | null;
  linkedForumSlug?: string | null;
  published?: boolean;
};

// ─── Slug generation ──────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (await VideoPostModel.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

// ─── Serialiser ───────────────────────────────────────────────────────────────

function toVideoPost(doc: IVideoPost): VideoPost {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    sourceType: doc.sourceType,
    youtubeVideoId: doc.youtubeVideoId ?? null,
    videoUrl: doc.videoUrl ?? null,
    embedUrl: doc.embedUrl ?? null,
    thumbnailUrl: doc.thumbnailUrl ?? null,
    animatedPreviewUrl: doc.animatedPreviewUrl ?? null,
    durationSeconds: doc.durationSeconds ?? null,
    shortCaption: doc.shortCaption,
    transcript: doc.transcript ?? null,
    summary: doc.summary ?? null,
    tags: doc.tags ?? [],
    category: doc.category,
    linkedBlogSlug: doc.linkedBlogSlug ?? null,
    linkedForumSlug: doc.linkedForumSlug ?? null,
    views: doc.views,
    likes: doc.likes,
    skips: doc.skips,
    totalDwellMs: doc.totalDwellMs,
    hotScore: doc.hotScore,
    qualityScore: doc.qualityScore,
    published: doc.published,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ─── Validity guard ───────────────────────────────────────────────────────────

/**
 * A VideoPost is only "serveable" if it has a real media source.
 * This prevents dead/placeholder cards from ever rendering.
 */
function isServeable(doc: IVideoPost): boolean {
  if (doc.sourceType === "youtube") return !!doc.youtubeVideoId;
  return !!doc.videoUrl;
}

// ─── Feed sort types ──────────────────────────────────────────────────────────

export type VideoFeedSort = "hot" | "new" | "trending" | "top";

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getVideoPosts({
  sort = "hot",
  page = 1,
  limit = 20,
  tag,
  category,
  includeUnpublished = false,
}: {
  sort?: VideoFeedSort;
  page?: number;
  limit?: number;
  tag?: string;
  category?: string;
  includeUnpublished?: boolean;
}): Promise<{ posts: VideoPost[]; total: number }> {
  await connectToDatabase();

  const filter: FilterQuery<IVideoPost> = { deletedAt: null };
  if (!includeUnpublished) filter.published = true;
  if (tag) filter.tags = tag;
  if (category) filter.category = category;

  const sortMap: Record<VideoFeedSort, Record<string, SortOrder>> = {
    hot:      { hotScore: -1, createdAt: -1 },
    new:      { createdAt: -1 },
    trending: { hotScore: -1, views: -1 },
    top:      { likes: -1, views: -1 },
  };

  const safePage  = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    VideoPostModel.find(filter)
      .sort(sortMap[sort] ?? sortMap.hot)
      .skip(skip)
      .limit(safeLimit)
      .lean<IVideoPost[]>(),
    VideoPostModel.countDocuments(filter),
  ]);

  // Validity filter: never return a post without real media
  const serveable = docs.filter(isServeable);

  return { posts: serveable.map(toVideoPost), total };
}

export async function getVideoPostBySlug(slug: string): Promise<VideoPost | null> {
  await connectToDatabase();
  const doc = await VideoPostModel.findOne({ slug, deletedAt: null }).lean<IVideoPost>();
  if (!doc || !isServeable(doc)) return null;
  return toVideoPost(doc);
}

export async function getVideoPostById(id: string): Promise<VideoPost | null> {
  await connectToDatabase();
  const doc = await VideoPostModel.findById(id).lean<IVideoPost>();
  if (!doc || !isServeable(doc)) return null;
  return toVideoPost(doc);
}

export async function createVideoPost(input: VideoPostWriteInput): Promise<VideoPost> {
  await connectToDatabase();

  const baseSlug = input.slug?.trim() || toSlug(input.title);
  const slug = await generateUniqueSlug(baseSlug);

  const doc = new VideoPostModel({
    ...input,
    slug,
    tags: [...new Set((input.tags ?? []).filter(Boolean))],
    published: input.published ?? false,
  });

  await doc.save();
  return toVideoPost(doc);
}

export async function updateVideoPost(
  id: string,
  patch: Partial<VideoPostWriteInput>,
): Promise<VideoPost | null> {
  await connectToDatabase();

  const update: Partial<IVideoPost> = { ...patch } as Partial<IVideoPost>;
  if (patch.tags) {
    (update as Record<string, unknown>).tags = [...new Set(patch.tags.filter(Boolean))];
  }

  // Recompute embedUrl if source changed
  if (patch.youtubeVideoId !== undefined || patch.videoUrl !== undefined) {
    (update as Record<string, unknown>).embedUrl = null; // cleared so pre-save hook recomputes
  }

  const doc = await VideoPostModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean<IVideoPost>();
  if (!doc) return null;
  return toVideoPost(doc);
}

export async function deleteVideoPost(id: string): Promise<boolean> {
  await connectToDatabase();
  const result = await VideoPostModel.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } });
  return !!result;
}

// ─── Engagement mutations ─────────────────────────────────────────────────────

export async function incrementVideoView(slug: string): Promise<void> {
  await connectToDatabase();
  await VideoPostModel.findOneAndUpdate(
    { slug, deletedAt: null },
    { $inc: { views: 1 } },
  );
}

export async function toggleVideoLike(
  slug: string,
  direction: "like" | "unlike",
): Promise<{ likes: number }> {
  await connectToDatabase();
  const delta = direction === "like" ? 1 : -1;
  const doc = await VideoPostModel.findOneAndUpdate(
    { slug, deletedAt: null },
    { $inc: { likes: delta } },
    { new: true },
  ).lean<IVideoPost>();
  return { likes: doc?.likes ?? 0 };
}

export async function recordVideoSkip(slug: string, dwellMs: number): Promise<void> {
  await connectToDatabase();
  await VideoPostModel.findOneAndUpdate(
    { slug, deletedAt: null },
    { $inc: { skips: 1, totalDwellMs: dwellMs } },
  );
}

export async function recordVideoDwell(slug: string, dwellMs: number): Promise<void> {
  await connectToDatabase();
  await VideoPostModel.findOneAndUpdate(
    { slug, deletedAt: null },
    { $inc: { totalDwellMs: dwellMs } },
  );
}

// ─── Tag-based video lookup (for cross-linking from blog/forum) ───────────────

/**
 * Returns published, serveable video posts whose tags overlap with the
 * provided tag list. Used to surface related shorts on blog/forum detail pages.
 */
export async function getVideosByTags(tags: string[], limit = 3): Promise<VideoPost[]> {
  if (!tags.length) return [];
  await connectToDatabase();

  const docs = await VideoPostModel.find({
    published: true,
    deletedAt: null,
    tags: { $in: tags },
  })
    .sort({ hotScore: -1 })
    .limit(limit)
    .lean<IVideoPost[]>();

  return docs.filter(isServeable).map(toVideoPost);
}

// ─── Sitemap helper ───────────────────────────────────────────────────────────

export async function getAllVideoSlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await VideoPostModel.find({ published: true, deletedAt: null })
    .select("slug")
    .lean<{ slug: string }[]>();
  return docs.map((d) => d.slug);
}

// ─── Content-derived YouTube recommendation service ───────────────────────────
//
// Pure function — no I/O. Returns curated YouTube search query suggestions
// based on construction-domain tags so that admins can find real videos
// to add to the platform. This deliberately avoids making API calls to
// YouTube or using placeholder/synthetic data.

const TAG_TO_QUERIES: Record<string, string[]> = {
  // Estimation & Costing
  "cost estimation":     ["construction cost estimation tutorial", "BOQ quantity surveying walkthrough", "construction estimate explained"],
  "boq":                 ["bill of quantities tutorial", "BOQ construction explained", "quantity surveying BOQ guide"],
  "quantity surveying":  ["quantity surveying for beginners", "QS career construction", "quantity takeoff explained"],
  "budgeting":           ["construction project budgeting", "how to budget a construction project", "cost control construction site"],

  // Structural
  "foundation":          ["foundation types construction", "concrete foundation pour walkthrough", "deep foundation pile explained"],
  "concrete":            ["concrete mix design explained", "reinforced concrete structure", "concrete pouring techniques construction"],
  "structural":          ["structural engineering basics", "load bearing wall explained", "beam column design construction"],
  "steel":               ["steel structure construction", "steel frame building process", "structural steel fabrication"],

  // MEP
  "plumbing":            ["plumbing rough-in construction", "pipe installation site walkthrough", "plumbing system building explained"],
  "electrical":          ["electrical wiring construction building", "MEP coordination construction", "site electrical installation"],
  "hvac":                ["HVAC installation construction", "ductwork HVAC site", "mechanical system building"],

  // Project Management
  "project management":  ["construction project management tips", "site manager day construction", "construction scheduling CPM"],
  "scheduling":          ["construction schedule primavera tutorial", "MS project construction schedule", "site planning construction"],
  "safety":              ["construction site safety walkthrough", "PPE construction explained", "fall protection construction safety"],

  // Materials
  "materials":           ["construction materials comparison", "building materials guide", "sustainable construction materials"],
  "timber":              ["timber frame construction", "wood framing walkthrough", "mass timber construction explained"],
  "masonry":             ["brick masonry construction", "blockwork construction guide", "masonry wall construction"],

  // Design & Architecture
  "architecture":        ["modern architecture design process", "architectural working drawings explained", "building design walkthrough"],
  "interior design":     ["interior design construction phase", "fit out construction walkthrough", "interior finishing construction"],
  "sustainable":         ["sustainable building construction", "green building LEED explained", "passive house construction"],

  // Real Estate & Infrastructure
  "real estate":         ["real estate development process", "property development construction", "real estate investment construction"],
  "infrastructure":      ["infrastructure project construction", "civil engineering infrastructure", "bridge construction explained"],
  "roads":               ["road construction process", "highway construction walkthrough", "pavement construction explained"],

  // General construction
  "construction":        ["construction site walkthrough", "how a building is built", "construction process explained"],
  "building":            ["building construction process", "new construction home walkthrough", "commercial building construction"],
};

/**
 * Given an array of tags from a blog post or forum thread, returns a list
 * of curated YouTube search query strings that admins can use to find
 * relevant short-form video content.
 *
 * Returns unique queries, prioritising exact tag matches first.
 */
export function deriveYouTubeQuerySuggestions(tags: string[]): string[] {
  const normalised = tags.map((t) => t.toLowerCase().trim());
  const queries = new Set<string>();

  for (const tag of normalised) {
    // Exact match
    if (TAG_TO_QUERIES[tag]) {
      for (const q of TAG_TO_QUERIES[tag]) queries.add(q);
      continue;
    }
    // Partial match: check if any key is a substring of the tag or vice versa
    for (const [key, qs] of Object.entries(TAG_TO_QUERIES)) {
      if (tag.includes(key) || key.includes(tag)) {
        for (const q of qs) queries.add(q);
      }
    }
  }

  return [...queries].slice(0, 6);
}

/**
 * Returns all distinct tags across published VideoPost documents.
 * Used for sitemap generation.
 */
export async function getAllVideoTags(): Promise<string[]> {
  await connectToDatabase();
  const result = await VideoPostModel.distinct("tags", { published: true, deletedAt: null });
  return result as string[];
}
