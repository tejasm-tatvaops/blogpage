import { connectToDatabase } from "@/lib/mongodb";
import { TutorialModel, type TutorialDifficulty } from "@/models/Tutorial";
import { LearningPathModel } from "@/models/LearningPath";
import { TutorialProgressModel } from "@/models/TutorialProgress";
import { ContentIngestionJobModel } from "@/models/ContentIngestionJob";
import { ReputationEventModel } from "@/models/ReputationEvent";
import mongoose from "mongoose";
import type { FilterQuery } from "mongoose";

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
  while (await TutorialModel.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export type TutorialListOptions = {
  page?: number;
  limit?: number;
  difficulty?: TutorialDifficulty | null;
  tag?: string | null;
  query?: string | null;
  learningPathId?: string | null;
  learningPathSlug?: string | null;
  includeUnpublished?: boolean;
};

export async function getTutorials(opts: TutorialListOptions = {}) {
  await connectToDatabase();

  const {
    page  = 1,
    limit = 20,
    difficulty,
    tag,
    query,
    learningPathId,
    learningPathSlug,
    includeUnpublished = false,
  } = opts;

  const filter: FilterQuery<typeof TutorialModel> = {
    deleted_at: null,
  };
  if (!includeUnpublished) {
    filter.published = true;
  }

  if (difficulty) filter.difficulty = difficulty;
  if (tag)        filter.tags = tag;
  if (learningPathId) {
    filter.learning_path_id = learningPathId;
  } else if (learningPathSlug) {
    const path = await LearningPathModel.findOne({ slug: learningPathSlug }).select("_id").lean();
    if (!path?._id) {
      return { tutorials: [], total: 0, page, limit };
    }
    filter.learning_path_id = path._id;
  }

  if (query) {
    filter.$text = { $search: query };
  }

  const skip = (page - 1) * limit;

  const [tutorials, total] = await Promise.all([
    TutorialModel.find(filter)
      .sort(query ? { score: { $meta: "textScore" } } : { step_number: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content") // omit body for list view
      .lean(),
    TutorialModel.countDocuments(filter),
  ]);

  return { tutorials, total, page, limit };
}

export async function getTutorialBySlug(slug: string) {
  await connectToDatabase();
  return TutorialModel.findOne({ slug, published: true, deleted_at: null }).lean();
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateTutorialInput = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  difficulty?: TutorialDifficulty;
  contentType?: "article" | "video" | "hybrid";
  tags?: string[];
  category: string;
  coverImage?: string | null;
  learningPathId?: string | null;
  stepNumber?: number | null;
  linkedVideoSlug?: string | null;
  linkedBlogSlug?: string | null;
  estimatedMinutes?: number;
  published?: boolean;
};

export async function createTutorial(input: CreateTutorialInput) {
  await connectToDatabase();
  const baseSlug = toSlug(input.title);
  const slug = await generateUniqueSlug(baseSlug);

  return TutorialModel.create({
    title:    input.title,
    slug,
    excerpt:  input.excerpt,
    content:  input.content,
    author:   input.author,
    difficulty:   input.difficulty ?? "beginner",
    content_type: input.contentType ?? "article",
    tags:     input.tags ?? [],
    category: input.category,
    cover_image: input.coverImage ?? null,
    learning_path_id: input.learningPathId ?? null,
    step_number:      input.stepNumber ?? null,
    linked_video_slug: input.linkedVideoSlug ?? null,
    linked_blog_slug:  input.linkedBlogSlug ?? null,
    estimated_minutes: input.estimatedMinutes ?? 5,
    published: input.published ?? false,
  });
}

export async function updateTutorial(id: string, updates: Partial<CreateTutorialInput>) {
  await connectToDatabase();
  return TutorialModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(updates.title     !== undefined ? { title: updates.title }              : {}),
        ...(updates.excerpt   !== undefined ? { excerpt: updates.excerpt }          : {}),
        ...(updates.content   !== undefined ? { content: updates.content }          : {}),
        ...(updates.difficulty!== undefined ? { difficulty: updates.difficulty }    : {}),
        ...(updates.tags      !== undefined ? { tags: updates.tags }                : {}),
        ...(updates.published !== undefined ? { published: updates.published }      : {}),
        ...(updates.coverImage!== undefined ? { cover_image: updates.coverImage }  : {}),
        ...(updates.author !== undefined ? { author: updates.author } : {}),
        ...(updates.category !== undefined ? { category: updates.category } : {}),
        ...(updates.contentType !== undefined ? { content_type: updates.contentType } : {}),
        ...(updates.learningPathId !== undefined ? { learning_path_id: updates.learningPathId } : {}),
        ...(updates.stepNumber !== undefined ? { step_number: updates.stepNumber } : {}),
        ...(updates.linkedVideoSlug !== undefined ? { linked_video_slug: updates.linkedVideoSlug } : {}),
        ...(updates.linkedBlogSlug !== undefined ? { linked_blog_slug: updates.linkedBlogSlug } : {}),
        ...(updates.estimatedMinutes !== undefined ? { estimated_minutes: updates.estimatedMinutes } : {}),
      },
    },
    { new: true },
  ).lean();
}

export async function deleteTutorial(id: string) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false as const, reason: "invalid_id" as const };
  }

  const tutorial = await TutorialModel.findById(id)
    .select("_id slug learning_path_id deleted_at")
    .lean();
  if (!tutorial || tutorial.deleted_at) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const tutorialId = tutorial._id;
  const tutorialSlug = String(tutorial.slug);

  await TutorialModel.updateOne(
    { _id: tutorialId },
    { $set: { deleted_at: new Date(), published: false } },
  );

  await Promise.all([
    // Remove user progress entries tied to this tutorial to avoid orphaned progress rows.
    TutorialProgressModel.deleteMany({
      $or: [{ tutorial_id: tutorialId }, { tutorial_slug: tutorialSlug }],
    }),
    // Ensure learning paths no longer reference this tutorial id.
    LearningPathModel.updateMany(
      { tutorial_ids: tutorialId },
      { $pull: { tutorial_ids: tutorialId } },
    ),
    // Clear published references from ingestion jobs that pointed to this tutorial.
    ContentIngestionJobModel.updateMany(
      { published_content_type: "tutorial", published_slug: tutorialSlug },
      {
        $set: {
          published_slug: null,
          published_content_type: "tutorial_deleted",
        },
      },
    ),
    // Preserve reputation ledger values but remove broken slug linkage to deleted tutorial.
    ReputationEventModel.updateMany(
      {
        source_content_type: "tutorial",
        source_content_slug: tutorialSlug,
      },
      {
        $set: { source_content_slug: null },
      },
    ),
  ]);

  return { ok: true as const };
}

// ─── Learning paths ───────────────────────────────────────────────────────────

export async function getLearningPaths() {
  await connectToDatabase();
  return LearningPathModel.find({ published: true }).sort({ created_at: -1 }).lean();
}

export async function getLearningPathBySlug(slug: string) {
  await connectToDatabase();
  const path = await LearningPathModel.findOne({ slug, published: true }).lean();
  if (!path) return null;

  const tutorials = await TutorialModel.find({
    learning_path_id: (path as unknown as { _id: unknown })._id,
    published: true,
    deleted_at: null,
  })
    .sort({ step_number: 1 })
    .select("-content")
    .lean();

  return { ...path, tutorials };
}
