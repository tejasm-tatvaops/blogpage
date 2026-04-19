import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * Tutorial — structured learning content.
 *
 * Tutorials differ from blogs in:
 *   - They have an explicit difficulty level
 *   - They belong to a LearningPath (optional)
 *   - They have step numbers for ordered navigation
 *   - They can link to a companion short video
 *   - They track completion rates (future: per-user progress)
 */

export const TUTORIAL_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const TUTORIAL_CONTENT_TYPES = ["article", "video", "hybrid"] as const;

export type TutorialDifficulty = (typeof TUTORIAL_DIFFICULTIES)[number];
export type TutorialContentType = (typeof TUTORIAL_CONTENT_TYPES)[number];

const tutorialSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true, trim: true, maxlength: 200 },
    slug:    { type: String, required: true, unique: true, index: true, trim: true, maxlength: 220 },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true, maxlength: 150_000 },

    cover_image: { type: String, default: null, trim: true },
    author:      { type: String, required: true, trim: true, maxlength: 100 },

    difficulty:   { type: String, enum: TUTORIAL_DIFFICULTIES, default: "beginner", index: true },
    content_type: { type: String, enum: TUTORIAL_CONTENT_TYPES, default: "article" },

    tags:     { type: [String], default: [], index: true },
    category: { type: String, required: true, trim: true, maxlength: 100 },

    // Ordering within a learning path
    learning_path_id: { type: mongoose.Schema.Types.ObjectId, ref: "LearningPath", default: null, index: true },
    step_number:      { type: Number, default: null },

    // Companion content links
    linked_video_slug: { type: String, default: null, trim: true },
    linked_blog_slug:  { type: String, default: null, trim: true },

    // Estimated reading/completion time in minutes
    estimated_minutes: { type: Number, default: 5, min: 1 },

    published:  { type: Boolean, default: false, index: true },
    deleted_at: { type: Date, default: null },

    // Engagement
    view_count: { type: Number, default: 0, min: 0 },
    like_count: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

tutorialSchema.index({ published: 1, created_at: -1 });
tutorialSchema.index({ difficulty: 1, published: 1 });
tutorialSchema.index({ learning_path_id: 1, step_number: 1 });
tutorialSchema.index({ tags: 1, published: 1 });
tutorialSchema.index(
  { title: "text", excerpt: "text", tags: "text", content: "text" },
  { weights: { title: 10, excerpt: 5, tags: 3, content: 1 }, name: "tutorial_fulltext" },
);

export type TutorialSchemaType = InferSchemaType<typeof tutorialSchema>;
export type TutorialModelType = Model<TutorialSchemaType>;

export const TutorialModel: TutorialModelType =
  (mongoose.models["Tutorial"] as TutorialModelType | undefined) ??
  mongoose.model<TutorialSchemaType>("Tutorial", tutorialSchema);
