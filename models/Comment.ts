import mongoose, { type InferSchemaType, type Model } from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post_id: { type: String, required: true, index: true },
    parent_comment_id: { type: String, default: null, index: true },
    author_name: { type: String, required: true, trim: true, maxlength: 80 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    upvote_count: { type: Number, default: 0, min: 0 },
    downvote_count: { type: Number, default: 0, min: 0 },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

commentSchema.index({ post_id: 1, created_at: -1 });
commentSchema.index({ post_id: 1, parent_comment_id: 1, created_at: 1 });

export type CommentSchemaType = InferSchemaType<typeof commentSchema>;

export type CommentDocument = CommentSchemaType & {
  _id: { toString(): string };
  created_at: Date;
};

export type CommentModelType = Model<CommentSchemaType>;

export const CommentModel: CommentModelType =
  (mongoose.models["Comment"] as CommentModelType | undefined) ??
  mongoose.model<CommentSchemaType>("Comment", commentSchema);
