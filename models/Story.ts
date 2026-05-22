import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const STORY_TYPES = ["image", "video", "text", "poll", "link"] as const;
export type StoryType = (typeof STORY_TYPES)[number];

export const STORY_VISIBILITY = ["public", "followers"] as const;
export type StoryVisibility = (typeof STORY_VISIBILITY)[number];

const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 120 },
    votes: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const storySchema = new mongoose.Schema(
  {
    // Author identity
    identity_key: { type: String, required: true, trim: true, index: true },
    display_name: { type: String, required: true, trim: true, maxlength: 80 },
    avatar_url: { type: String, default: null, trim: true },
    author_reputation_tier: { type: String, default: "member", trim: true, maxlength: 20 },

    // Story content
    story_type: { type: String, enum: STORY_TYPES, required: true, default: "text" },
    media_url: { type: String, default: null, trim: true },
    media_type: { type: String, enum: ["image", "video", null], default: null },
    text: { type: String, default: null, trim: true, maxlength: 500 },

    // Text story styling
    background_style: {
      type: String,
      default: "gradient-slate",
      trim: true,
      maxlength: 60,
    },

    // Poll story data
    poll_question: { type: String, default: null, trim: true, maxlength: 200 },
    poll_options: { type: [pollOptionSchema], default: [] },

    // Tagging + topic context
    tags: { type: [String], default: [], index: true },
    topic_category: { type: String, default: null, trim: true, maxlength: 60 },
    location: { type: String, default: null, trim: true, maxlength: 120 },

    // Cross-content linking (SEO + engagement loops)
    linked_blog_slug: { type: String, default: null, trim: true, index: true },
    linked_forum_slug: { type: String, default: null, trim: true, index: true },

    // Visibility + lifecycle
    visibility: { type: String, enum: STORY_VISIBILITY, default: "public" },
    expires_at: { type: Date, required: true, index: true },
    deleted_at: { type: Date, default: null },

    // Engagement counters (denormalized for fast reads)
    views_count: { type: Number, default: 0, min: 0 },
    reactions_count: { type: Number, default: 0, min: 0 },
    reply_count: { type: Number, default: 0, min: 0 },
    completion_rate: { type: Number, default: 0, min: 0, max: 1 },

    // Feed ranking
    ranking_score: { type: Number, default: 0, index: true },

    // AI metadata
    ai_generated: { type: Boolean, default: false },
    ai_caption: { type: String, default: null, trim: true, maxlength: 300 },
    ai_hashtags: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

// TTL: MongoDB auto-deletes documents after expires_at
storySchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Feed sort indexes
storySchema.index({ deleted_at: 1, expires_at: 1, created_at: -1 });
storySchema.index({ deleted_at: 1, expires_at: 1, ranking_score: -1, created_at: -1 });
storySchema.index({ identity_key: 1, deleted_at: 1, expires_at: 1, created_at: -1 });
storySchema.index({ tags: 1, deleted_at: 1, expires_at: 1, created_at: -1 });
storySchema.index({ linked_blog_slug: 1, deleted_at: 1, expires_at: 1 });
storySchema.index({ linked_forum_slug: 1, deleted_at: 1, expires_at: 1 });

export type StorySchemaType = InferSchemaType<typeof storySchema>;

export type StoryDocument = StorySchemaType & {
  _id: { toString(): string };
  created_at: Date;
  updated_at: Date;
};

export type StoryModelType = Model<StorySchemaType>;

export const StoryModel: StoryModelType =
  (mongoose.models["Story"] as StoryModelType | undefined) ??
  mongoose.model<StorySchemaType>("Story", storySchema);
