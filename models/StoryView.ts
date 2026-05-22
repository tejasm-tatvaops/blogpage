import mongoose, { type InferSchemaType, type Model } from "mongoose";

const storyViewSchema = new mongoose.Schema(
  {
    story_id: { type: String, required: true, trim: true, index: true },
    viewer_identity_key: { type: String, required: true, trim: true, index: true },
    viewed_at: { type: Date, default: Date.now },
    // How long the viewer spent on this story in ms
    dwell_time_ms: { type: Number, default: 0, min: 0 },
    // Whether the viewer watched to the end (progress bar completion)
    completed: { type: Boolean, default: false },
  },
  {
    versionKey: false,
  },
);

// One view record per viewer per story
storyViewSchema.index(
  { story_id: 1, viewer_identity_key: 1 },
  { unique: true },
);

// Analytics queries
storyViewSchema.index({ story_id: 1, viewed_at: -1 });
storyViewSchema.index({ viewer_identity_key: 1, viewed_at: -1 });

export type StoryViewSchemaType = InferSchemaType<typeof storyViewSchema>;
export type StoryViewModelType = Model<StoryViewSchemaType>;

export const StoryViewModel: StoryViewModelType =
  (mongoose.models["StoryView"] as StoryViewModelType | undefined) ??
  mongoose.model<StoryViewSchemaType>("StoryView", storyViewSchema);
