import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * ContentIngestionJob — tracks AI-assisted content generation from external sources.
 *
 * Lifecycle:
 *   1. User uploads PDF/DOC or pastes a URL → status: "pending"
 *   2. Background AI pipeline runs → status: "processing" → "ready"
 *   3. User previews the AI draft → optionally edits
 *   4. User publishes → status: "published" (blog/forum/short created)
 *   5. Any failure → status: "failed" with error message
 *
 * Source types:
 *   url       — external article or webpage URL
 *   pdf       — uploaded PDF document (stored as extracted text)
 *   doc       — uploaded DOC/DOCX (stored as extracted text)
 *   paste     — manually pasted external content
 */

export const INGESTION_SOURCE_TYPES = ["url", "pdf", "doc", "paste"] as const;
export const INGESTION_OUTPUT_TYPES = ["blog", "forum", "short_caption", "tutorial"] as const;
export const INGESTION_STATUSES     = ["pending", "processing", "ready", "published", "failed"] as const;

export type IngestionSourceType = (typeof INGESTION_SOURCE_TYPES)[number];
export type IngestionOutputType = (typeof INGESTION_OUTPUT_TYPES)[number];
export type IngestionStatus     = (typeof INGESTION_STATUSES)[number];

const contentIngestionJobSchema = new mongoose.Schema(
  {
    // Who initiated the job
    initiator_identity_key: { type: String, required: true, trim: true, index: true },

    source_type: { type: String, enum: INGESTION_SOURCE_TYPES, required: true },

    // URL (for url source type)
    source_url: { type: String, default: null, trim: true, maxlength: 2048 },

    // Extracted/pasted raw text from the source
    source_text: { type: String, default: null, maxlength: 200_000 },

    // Original filename (for pdf/doc uploads)
    source_filename: { type: String, default: null, trim: true, maxlength: 255 },

    // Desired output format
    output_type: { type: String, enum: INGESTION_OUTPUT_TYPES, default: "blog" },

    status: { type: String, enum: INGESTION_STATUSES, default: "pending", index: true },

    // AI-generated draft fields (populated once processing completes)
    ai_title:    { type: String, default: null, trim: true, maxlength: 200 },
    ai_excerpt:  { type: String, default: null, trim: true, maxlength: 500 },
    ai_content:  { type: String, default: null, maxlength: 150_000 },
    ai_tags:     { type: [String], default: [] },
    ai_category: { type: String, default: null, trim: true, maxlength: 100 },
    ai_summary:  { type: String, default: null, trim: true, maxlength: 1000 },
    ai_insights: { type: [String], default: [] }, // bullet-point key insights

    // User edits to AI draft (stored as overrides before publishing)
    edited_title:   { type: String, default: null, trim: true, maxlength: 200 },
    edited_content: { type: String, default: null, maxlength: 150_000 },

    // Published content reference (set once published)
    published_slug:        { type: String, default: null, trim: true },
    published_content_type:{ type: String, default: null, trim: true },

    error_message: { type: String, default: null, trim: true, maxlength: 500 },

    // Timestamps for the pipeline stages
    processing_started_at: { type: Date, default: null },
    processing_finished_at:{ type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

contentIngestionJobSchema.index({ status: 1, created_at: -1 });
contentIngestionJobSchema.index({ initiator_identity_key: 1, created_at: -1 });

export type ContentIngestionJobSchemaType = InferSchemaType<typeof contentIngestionJobSchema>;
export type ContentIngestionJobModelType = Model<ContentIngestionJobSchemaType>;

export const ContentIngestionJobModel: ContentIngestionJobModelType =
  (mongoose.models["ContentIngestionJob"] as ContentIngestionJobModelType | undefined) ??
  mongoose.model<ContentIngestionJobSchemaType>("ContentIngestionJob", contentIngestionJobSchema);
