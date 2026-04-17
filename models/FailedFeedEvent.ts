import mongoose, { type InferSchemaType, type Model } from "mongoose";

const failedFeedEventSchema = new mongoose.Schema(
  {
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    last_error: { type: String, default: null },
    next_retry_at: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["pending", "replayed"], default: "pending", index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

failedFeedEventSchema.index({ status: 1, next_retry_at: 1, created_at: 1 });

export type FailedFeedEventSchemaType = InferSchemaType<typeof failedFeedEventSchema>;
export type FailedFeedEventModelType = Model<FailedFeedEventSchemaType>;

export const FailedFeedEventModel: FailedFeedEventModelType =
  (mongoose.models["FailedFeedEvent"] as FailedFeedEventModelType | undefined) ??
  mongoose.model<FailedFeedEventSchemaType>("FailedFeedEvent", failedFeedEventSchema);
