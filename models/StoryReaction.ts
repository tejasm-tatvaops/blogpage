import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const STORY_REACTION_TYPES = ["fire", "clap", "insightful", "question", "heart"] as const;
export type StoryReactionType = (typeof STORY_REACTION_TYPES)[number];

const storyReactionSchema = new mongoose.Schema(
  {
    story_id: { type: String, required: true, trim: true, index: true },
    identity_key: { type: String, required: true, trim: true, index: true },
    reaction_type: {
      type: String,
      enum: STORY_REACTION_TYPES,
      required: true,
    },
    created_at: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

// One reaction per type per user per story
storyReactionSchema.index(
  { story_id: 1, identity_key: 1, reaction_type: 1 },
  { unique: true },
);

storyReactionSchema.index({ story_id: 1, reaction_type: 1 });
storyReactionSchema.index({ identity_key: 1, created_at: -1 });

export type StoryReactionSchemaType = InferSchemaType<typeof storyReactionSchema>;
export type StoryReactionModelType = Model<StoryReactionSchemaType>;

export const StoryReactionModel: StoryReactionModelType =
  (mongoose.models["StoryReaction"] as StoryReactionModelType | undefined) ??
  mongoose.model<StoryReactionSchemaType>("StoryReaction", storyReactionSchema);
