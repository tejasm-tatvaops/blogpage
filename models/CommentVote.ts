import mongoose, { type InferSchemaType, type Model } from "mongoose";

const commentVoteSchema = new mongoose.Schema(
  {
    post_id: { type: String, required: true, index: true },
    comment_id: { type: String, required: true, index: true },
    identity_key: { type: String, required: true, index: true },
    direction: { type: String, enum: ["up", "down"], required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

// One vote per identity per comment.
commentVoteSchema.index({ comment_id: 1, identity_key: 1 }, { unique: true });

export type CommentVoteSchemaType = InferSchemaType<typeof commentVoteSchema>;
export type CommentVoteModelType = Model<CommentVoteSchemaType>;

export const CommentVoteModel: CommentVoteModelType =
  (mongoose.models["CommentVote"] as CommentVoteModelType | undefined) ??
  mongoose.model<CommentVoteSchemaType>("CommentVote", commentVoteSchema);
