import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * One record per (blog_slug, identity_key) pair.
 * The unique compound index prevents duplicate likes from the same fingerprint/IP.
 * direction: "up" | "down" mirrors ForumVote semantics.
 */
const blogLikeSchema = new mongoose.Schema(
  {
    blog_slug: { type: String, required: true, index: true },
    identity_key: { type: String, required: true, index: true }, // "fp:xxx" | "ip:xxx"
    direction: { type: String, enum: ["up", "down"], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

// One vote per identity per blog — prevents ballot-stuffing.
blogLikeSchema.index({ blog_slug: 1, identity_key: 1 }, { unique: true });

export type BlogLikeSchemaType = InferSchemaType<typeof blogLikeSchema>;
export type BlogLikeModelType = Model<BlogLikeSchemaType>;

export const BlogLikeModel: BlogLikeModelType =
  (mongoose.models["BlogLike"] as BlogLikeModelType | undefined) ??
  mongoose.model<BlogLikeSchemaType>("BlogLike", blogLikeSchema);
