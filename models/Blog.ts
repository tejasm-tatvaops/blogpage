import mongoose, { type InferSchemaType, type Model } from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 220 },
    content: { type: String, required: true, maxlength: 150_000 },
    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    cover_image: { type: String, default: null },
    author: { type: String, required: true, trim: true, maxlength: 100 },
    tags: { type: [String], default: [], index: true },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    published: { type: Boolean, default: false, index: true },
    upvote_count: { type: Number, default: 0, min: 0 },
    view_count: { type: Number, default: 0, min: 0 },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

// Compound indexes for common query patterns
blogSchema.index({ published: 1, created_at: -1 });
blogSchema.index({ category: 1, published: 1, created_at: -1 });
blogSchema.index({ deleted_at: 1 });

export type BlogSchemaType = InferSchemaType<typeof blogSchema>;

export type BlogDocument = BlogSchemaType & {
  _id: { toString(): string };
  created_at: Date;
  deleted_at: Date | null;
};

export type BlogModelType = Model<BlogSchemaType>;

export const BlogModel: BlogModelType =
  (mongoose.models["Blog"] as BlogModelType | undefined) ??
  mongoose.model<BlogSchemaType>("Blog", blogSchema);
