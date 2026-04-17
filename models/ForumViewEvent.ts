import mongoose, { type InferSchemaType, type Model } from "mongoose";

const forumViewEventSchema = new mongoose.Schema(
  {
    forum_slug: { type: String, required: true, trim: true, index: true },
    post_id: { type: String, required: true, trim: true, index: true },
    referrer_host: { type: String, default: "direct", trim: true, index: true },
    user_agent: { type: String, default: "", trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

forumViewEventSchema.index({ created_at: -1 });
forumViewEventSchema.index({ post_id: 1, created_at: -1 });
forumViewEventSchema.index({ forum_slug: 1, created_at: -1 });

export type ForumViewEventSchemaType = InferSchemaType<typeof forumViewEventSchema>;
export type ForumViewEventModelType = Model<ForumViewEventSchemaType>;

export const ForumViewEventModel: ForumViewEventModelType =
  (mongoose.models["ForumViewEvent"] as ForumViewEventModelType | undefined) ??
  mongoose.model<ForumViewEventSchemaType>("ForumViewEvent", forumViewEventSchema);
