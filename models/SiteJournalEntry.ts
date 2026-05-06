import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const siteJournalEntryTypeValues = [
  "Execution Update",
  "Procurement Insight",
  "Labor Update",
  "Vendor Change",
  "Risk Alert",
  "Milestone",
  "Cost Change",
  "Material Delivery",
  "AI Observation",
  "Field Note",
] as const;

const mediaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], default: "image" },
    url: { type: String, required: true, trim: true, maxlength: 2_000 },
    caption: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { _id: false },
);

const locationContextSchema = new mongoose.Schema(
  {
    city: { type: String, default: "", trim: true, maxlength: 120 },
    region: { type: String, default: "", trim: true, maxlength: 120 },
    area: { type: String, default: "", trim: true, maxlength: 120 },
  },
  { _id: false },
);

const siteJournalEntrySchema = new mongoose.Schema(
  {
    journal_id: { type: String, required: true, trim: true, maxlength: 60, index: true },
    week_number: { type: Number, required: true, min: 1, max: 500, index: true },
    entry_type: { type: String, enum: siteJournalEntryTypeValues, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, required: true, trim: true, maxlength: 20_000 },
    media: { type: [mediaSchema], default: [] },
    location_context: { type: locationContextSchema, default: () => ({}) },
    risk_level: { type: String, enum: ["low", "medium", "high"], default: "low", index: true },
    tags: { type: [String], default: [], index: true },
    ai_insight: { type: String, default: "", trim: true, maxlength: 2_000 },
    related_discussion_ids: { type: [String], default: [] },
    created_by: { type: String, required: true, trim: true, maxlength: 160, index: true },
    moderation_status: { type: String, enum: ["clean", "flagged", "restricted"], default: "clean", index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

siteJournalEntrySchema.index({ journal_id: 1, week_number: -1, created_at: -1 });
siteJournalEntrySchema.index({ journal_id: 1, created_at: -1 });

export type SiteJournalEntrySchemaType = InferSchemaType<typeof siteJournalEntrySchema>;
export type SiteJournalEntryDocument = SiteJournalEntrySchemaType & {
  _id: { toString(): string };
  created_at: Date;
  updated_at: Date;
};
export type SiteJournalEntryModelType = Model<SiteJournalEntrySchemaType>;

export const SiteJournalEntryModel: SiteJournalEntryModelType =
  (mongoose.models["SiteJournalEntry"] as SiteJournalEntryModelType | undefined) ??
  mongoose.model<SiteJournalEntrySchemaType>("SiteJournalEntry", siteJournalEntrySchema);
