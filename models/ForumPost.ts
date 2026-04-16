import mongoose, { type InferSchemaType, type Model } from "mongoose";

const forumPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 50_000 },
    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    tags: { type: [String], default: [], index: true },
    author_name: { type: String, default: "Anonymous", trim: true, maxlength: 80 },
    upvote_count: { type: Number, default: 0, min: 0 },
    downvote_count: { type: Number, default: 0, min: 0 },
    // Reddit-style hot score: stored for fast index sort
    score: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0, min: 0 },
    view_count: { type: Number, default: 0, min: 0 },
    is_featured: { type: Boolean, default: false, index: true },
    is_trending: { type: Boolean, default: false, index: true },
    // Best answer: set by creator, references a Comment _id
    best_comment_id: { type: String, default: null },
    // Blog ↔ Forum integration
    linked_blog_slug: { type: String, default: null, index: true },
    // Lightweight identity: fingerprint of creator for best-answer auth
    creator_fingerprint: { type: String, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

// Feed sort indexes
forumPostSchema.index({ deleted_at: 1, created_at: -1 });
forumPostSchema.index({ deleted_at: 1, score: -1, created_at: -1 });
forumPostSchema.index({ deleted_at: 1, is_featured: -1, score: -1, created_at: -1 });
forumPostSchema.index({ deleted_at: 1, upvote_count: -1, created_at: -1 });
forumPostSchema.index({ deleted_at: 1, comment_count: -1, created_at: -1 });
// Tag filter + score sort
forumPostSchema.index({ tags: 1, deleted_at: 1, score: -1, created_at: -1 });

export type ForumPostSchemaType = InferSchemaType<typeof forumPostSchema>;

export type ForumPostDocument = ForumPostSchemaType & {
  _id: { toString(): string };
  created_at: Date;
  updated_at: Date;
};

export type ForumPostModelType = Model<ForumPostSchemaType>;

export const ForumPostModel: ForumPostModelType =
  (mongoose.models["ForumPost"] as ForumPostModelType | undefined) ??
  mongoose.model<ForumPostSchemaType>("ForumPost", forumPostSchema);
