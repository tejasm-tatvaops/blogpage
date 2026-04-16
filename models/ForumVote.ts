import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * Records one vote per (post_id, fingerprint_id) pair.
 * Unique compound index prevents duplicate votes even across restarts.
 */
const forumVoteSchema = new mongoose.Schema(
  {
    post_id: { type: String, required: true },
    fingerprint_id: { type: String, required: true },
    direction: { type: String, enum: ["up", "down"], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

forumVoteSchema.index({ post_id: 1, fingerprint_id: 1 }, { unique: true });

export type ForumVoteSchemaType = InferSchemaType<typeof forumVoteSchema>;

export type ForumVoteModelType = Model<ForumVoteSchemaType>;

export const ForumVoteModel: ForumVoteModelType =
  (mongoose.models["ForumVote"] as ForumVoteModelType | undefined) ??
  mongoose.model<ForumVoteSchemaType>("ForumVote", forumVoteSchema);
