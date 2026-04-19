import mongoose, { type InferSchemaType, type Model } from "mongoose";

const feedEventSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    event_type: {
      type: String,
      required: true,
      enum: ["feed_served", "post_clicked", "post_liked", "dwell_time", "skip", "share", "cross_content_click"],
      index: true,
    },
    post_slug: { type: String, default: null, trim: true, index: true },
    tags: { type: [String], default: [] },
    category: { type: String, default: null, trim: true },
    dwell_ms: { type: Number, default: 0, min: 0 },
    experiment_id: { type: String, default: "feed_v3" },
    variant_id: { type: String, default: "control", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    request_id: { type: String, default: null, trim: true, index: true },
    position: { type: Number, default: null, min: 0 },
    interaction_depth: { type: String, enum: ["low", "medium", "high"], default: null },
    author_key: { type: String, default: null, trim: true, index: true },
    // Cross-content click tracking (additive — null for non-cross-content events)
    source_content_type: { type: String, default: null, trim: true },
    target_content_type: { type: String, default: null, trim: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

feedEventSchema.index({ created_at: -1, event_type: 1 });
feedEventSchema.index({ identity_key: 1, created_at: -1 });
feedEventSchema.index({ post_slug: 1, event_type: 1, created_at: -1 });
feedEventSchema.index({ identity_key: 1, event_type: 1, created_at: -1 });
feedEventSchema.index({ identity_key: 1, author_key: 1, created_at: -1 });
feedEventSchema.index({ request_id: 1, created_at: -1 });

export type FeedEventSchemaType = InferSchemaType<typeof feedEventSchema>;
export type FeedEventModelType = Model<FeedEventSchemaType>;

export const FeedEventModel: FeedEventModelType =
  (mongoose.models["FeedEvent"] as FeedEventModelType | undefined) ??
  mongoose.model<FeedEventSchemaType>("FeedEvent", feedEventSchema);
