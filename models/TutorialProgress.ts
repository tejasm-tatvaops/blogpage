import mongoose, { type InferSchemaType, type Model } from "mongoose";

const tutorialProgressSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    tutorial_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tutorial", required: true, index: true },
    tutorial_slug: { type: String, required: true, trim: true, index: true },
    learning_path_id: { type: mongoose.Schema.Types.ObjectId, ref: "LearningPath", default: null, index: true },
    completed_step_keys: { type: [String], default: [] },
    total_steps: { type: Number, default: 0, min: 0 },
    completion_percent: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
    first_started_at: { type: Date, default: Date.now },
    last_activity_at: { type: Date, default: Date.now, index: true },
    completed_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

tutorialProgressSchema.index({ identity_key: 1, tutorial_slug: 1 }, { unique: true });
tutorialProgressSchema.index({ identity_key: 1, learning_path_id: 1, completion_percent: -1 });

export type TutorialProgressSchemaType = InferSchemaType<typeof tutorialProgressSchema>;
export type TutorialProgressModelType = Model<TutorialProgressSchemaType>;

export const TutorialProgressModel: TutorialProgressModelType =
  (mongoose.models["TutorialProgress"] as TutorialProgressModelType | undefined) ??
  mongoose.model<TutorialProgressSchemaType>("TutorialProgress", tutorialProgressSchema);
