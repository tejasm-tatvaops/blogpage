import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const SEMANTIC_SOURCE_TYPES = ["blog", "forum", "tutorial", "short"] as const;
export type SemanticSourceType = (typeof SEMANTIC_SOURCE_TYPES)[number];

const semanticDocumentSchema = new mongoose.Schema(
  {
    source_type: { type: String, enum: SEMANTIC_SOURCE_TYPES, required: true, index: true },
    slug: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    excerpt: { type: String, default: "", maxlength: 1200 },
    snippet: { type: String, default: "", maxlength: 10000 },
    tags: { type: [String], default: [] },
    category: { type: String, default: "" },
    trust_score: { type: Number, default: 0.6, min: 0, max: 1 },
    token_cache: { type: [String], default: [] },
    source_updated_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

semanticDocumentSchema.index({ source_type: 1, slug: 1 }, { unique: true });
semanticDocumentSchema.index({ updated_at: -1 });
semanticDocumentSchema.index({ token_cache: 1 });

export type SemanticDocumentSchemaType = InferSchemaType<typeof semanticDocumentSchema>;
export type SemanticDocumentModelType = Model<SemanticDocumentSchemaType>;

export const SemanticDocumentModel: SemanticDocumentModelType =
  (mongoose.models["SemanticDocument"] as SemanticDocumentModelType | undefined) ??
  mongoose.model<SemanticDocumentSchemaType>("SemanticDocument", semanticDocumentSchema);

