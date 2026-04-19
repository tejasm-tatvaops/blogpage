import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * LearningPath — a curated sequence of tutorials.
 *
 * Examples:
 *   "Getting Started with TatvaOps" (3 tutorials)
 *   "Construction Estimation Fundamentals" (5 tutorials)
 *   "Advanced Project Planning" (4 tutorials)
 */

const learningPathSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    slug:        { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    cover_image: { type: String, default: null, trim: true },
    tags:        { type: [String], default: [] },
    published:   { type: Boolean, default: false, index: true },
    // Ordered list of tutorial IDs (denormalised for fast path rendering)
    tutorial_ids: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    estimated_total_minutes: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

export type LearningPathSchemaType = InferSchemaType<typeof learningPathSchema>;
export type LearningPathModelType = Model<LearningPathSchemaType>;

export const LearningPathModel: LearningPathModelType =
  (mongoose.models["LearningPath"] as LearningPathModelType | undefined) ??
  mongoose.model<LearningPathSchemaType>("LearningPath", learningPathSchema);
