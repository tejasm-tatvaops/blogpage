import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const siteJournalStatusValues = ["draft", "pending_review", "published", "archived"] as const;
export const siteJournalHealthValues = ["stable", "watch_procurement", "delay_risk", "stabilized"] as const;
export const siteJournalVisibilityValues = ["public", "unlisted", "private"] as const;
export const siteJournalModerationValues = ["clean", "flagged", "restricted"] as const;

const contributorSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    badge: { type: String, default: "", trim: true, maxlength: 80 },
    role: { type: String, default: "contributor", trim: true, maxlength: 80 },
  },
  { _id: false },
);

const siteJournalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true, unique: true, index: true, maxlength: 220 },
    description: { type: String, default: "", trim: true, maxlength: 10_000 },
    cover_media: { type: String, default: "", trim: true, maxlength: 2_000 },
    project_type: { type: String, default: "", trim: true, maxlength: 120, index: true },
    city: { type: String, default: "", trim: true, maxlength: 120, index: true },
    region: { type: String, default: "", trim: true, maxlength: 120 },
    budget_range: { type: String, default: "", trim: true, maxlength: 120 },
    timeline_start_date: { type: Date, required: true },
    status: { type: String, enum: siteJournalStatusValues, default: "draft", index: true },
    health_status: { type: String, enum: siteJournalHealthValues, default: "stable", index: true },
    owner_id: { type: String, required: true, trim: true, maxlength: 160, index: true },
    contributors: { type: [contributorSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    visibility: { type: String, enum: siteJournalVisibilityValues, default: "public", index: true },
    ai_summary: { type: String, default: "", trim: true, maxlength: 2_000 },
    featured: { type: Boolean, default: false, index: true },
    moderation_status: { type: String, enum: siteJournalModerationValues, default: "clean", index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

siteJournalSchema.index({ status: 1, visibility: 1, featured: -1, updated_at: -1 });
siteJournalSchema.index({ city: 1, status: 1, updated_at: -1 });
siteJournalSchema.index({ owner_id: 1, updated_at: -1 });

export type SiteJournalSchemaType = InferSchemaType<typeof siteJournalSchema>;
export type SiteJournalDocument = SiteJournalSchemaType & {
  _id: { toString(): string };
  created_at: Date;
  updated_at: Date;
};

export type SiteJournalModelType = Model<SiteJournalSchemaType>;

export const SiteJournalModel: SiteJournalModelType =
  (mongoose.models["SiteJournal"] as SiteJournalModelType | undefined) ??
  mongoose.model<SiteJournalSchemaType>("SiteJournal", siteJournalSchema);
