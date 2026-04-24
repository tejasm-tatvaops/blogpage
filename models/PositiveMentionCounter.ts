import mongoose, { type InferSchemaType, type Model } from "mongoose";

const positiveMentionCounterSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    post_slug: { type: String, required: true, trim: true, index: true },
    qualifying_count: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

positiveMentionCounterSchema.index({ identity_key: 1, post_slug: 1 }, { unique: true });

export type PositiveMentionCounterSchemaType = InferSchemaType<typeof positiveMentionCounterSchema>;
export type PositiveMentionCounterModelType = Model<PositiveMentionCounterSchemaType>;

export const PositiveMentionCounterModel: PositiveMentionCounterModelType =
  (mongoose.models["PositiveMentionCounter"] as PositiveMentionCounterModelType | undefined) ??
  mongoose.model<PositiveMentionCounterSchemaType>("PositiveMentionCounter", positiveMentionCounterSchema);
