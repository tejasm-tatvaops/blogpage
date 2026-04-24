import mongoose, { type InferSchemaType, type Model } from "mongoose";

export type JobType = "generate_forums" | "autopopulate" | "generate_blogs" | "forum_trend_drafts";
export type JobStatus = "pending" | "running" | "completed" | "failed";

const generationJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["generate_forums", "autopopulate", "generate_blogs", "forum_trend_drafts"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
      index: true,
    },
    params:       { type: mongoose.Schema.Types.Mixed, default: {} },
    result:       { type: mongoose.Schema.Types.Mixed, default: null },
    error:        { type: String, default: null },
    progress:     { type: Number, default: 0, min: 0, max: 100 },
    started_at:   { type: Date, default: null },
    completed_at: { type: Date, default: null },
    created_at:   { type: Date, default: Date.now, index: true },
  },
  { collection: "generation_jobs", versionKey: false, timestamps: false },
);

generationJobSchema.index({ status: 1, created_at: -1 });

export type GenerationJobSchemaType = InferSchemaType<typeof generationJobSchema>;
export type GenerationJobModelType = Model<GenerationJobSchemaType>;

export const GenerationJobModel: GenerationJobModelType =
  (mongoose.models["GenerationJob"] as GenerationJobModelType | undefined) ??
  mongoose.model<GenerationJobSchemaType>("GenerationJob", generationJobSchema);
