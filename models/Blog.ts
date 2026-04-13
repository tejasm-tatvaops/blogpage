import mongoose, { type InferSchemaType } from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true, trim: true },
    cover_image: { type: String, default: null },
    author: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    category: { type: String, required: true, trim: true },
    published: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

export type BlogDocument = InferSchemaType<typeof blogSchema> & {
  _id: { toString(): string };
  created_at: Date;
};

export const BlogModel = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
