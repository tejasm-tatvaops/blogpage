import mongoose, { type InferSchemaType, type Model } from "mongoose";

const expertiseConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default", index: true },
    professions: { type: [String], default: [] },
    expertise_areas: { type: [String], default: [] },
    badge_labels: { type: [String], default: [] },
    updated_by_admin: { type: String, default: null, trim: true, maxlength: 120 },
    updated_by_admin_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

export type ExpertiseConfigSchemaType = InferSchemaType<typeof expertiseConfigSchema>;
export type ExpertiseConfigModelType = Model<ExpertiseConfigSchemaType>;

export const ExpertiseConfigModel: ExpertiseConfigModelType =
  (mongoose.models["ExpertiseConfig"] as ExpertiseConfigModelType | undefined) ??
  mongoose.model<ExpertiseConfigSchemaType>("ExpertiseConfig", expertiseConfigSchema);
