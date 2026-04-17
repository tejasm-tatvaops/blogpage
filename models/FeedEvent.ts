import mongoose, { type InferSchemaType, type Model } from "mongoose";

const feedEventSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    event_type: {
      type: String,
      required: true,
      enum: ["feed_served", "post_clicked", "post_liked", "dwell_time", "skip"],
      index: true,
    },
    post_slug: { type: String, default: null, trim: true, index: true },
    tags: { type: [String], default: [] },
    category: { type: String, default: null, trim: true },
    dwell_ms: { type: Number, default: 0, min: 0 },
    experiment_id: { type: String, default: "feed_v3" },
    variant_id: { type: String, default: "control", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

feedEventSchema.index({ created_at: -1, event_type: 1 });
feedEventSchema.index({ identity_key: 1, created_at: -1 });
feedEventSchema.index({ post_slug: 1, event_type: 1, created_at: -1 });

export type FeedEventSchemaType = InferSchemaType<typeof feedEventSchema>;
export type FeedEventModelType = Model<FeedEventSchemaType>;

export const FeedEventModel: FeedEventModelType =
  (mongoose.models["FeedEvent"] as FeedEventModelType | undefined) ??
  mongoose.model<FeedEventSchemaType>("FeedEvent", feedEventSchema);
