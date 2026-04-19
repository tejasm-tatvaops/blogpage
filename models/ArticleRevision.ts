import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * ArticleRevision — stores proposed and approved edits to blog articles.
 *
 * Workflow:
 *   1. Any user submits a "suggest_edit" → status: "pending"
 *   2. Reviewer (reputation_tier ≥ "expert") reviews → "approved" or "rejected"
 *   3. Admin can force-approve/reject via admin panel
 *   4. Approved revisions increment the blog's version counter and store a
 *      version snapshot in Blog.versions[] (which already exists in the schema)
 *
 * Rollback: admin can apply any historical approved revision back to the blog.
 *
 * Diff: stored as the raw proposed content; diff rendering is computed client-side
 * from (blog.content, revision.proposed_content) — no extra storage needed.
 */

export const REVISION_STATUSES = ["pending", "approved", "rejected", "rolled_back"] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

const articleRevisionSchema = new mongoose.Schema(
  {
    // The blog this revision targets
    blog_slug:  { type: String, required: true, trim: true, index: true },
    blog_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true, index: true },

    // What the proposer suggests changing
    proposed_title:   { type: String, default: null, trim: true, maxlength: 200 },
    proposed_content: { type: String, required: true, maxlength: 150_000 },
    proposed_excerpt: { type: String, default: null, trim: true, maxlength: 300 },

    // Snapshot of the article at the time of proposal (for accurate diffing)
    base_title:   { type: String, required: true, trim: true },
    base_content: { type: String, required: true },
    base_excerpt: { type: String, default: null },

    // Proposer identity
    proposer_identity_key: { type: String, required: true, trim: true, index: true },
    proposer_display_name: { type: String, required: true, trim: true, maxlength: 120 },

    // Reviewer details (set when status moves out of "pending")
    reviewer_identity_key: { type: String, default: null, trim: true },
    reviewer_display_name: { type: String, default: null, trim: true },
    reviewer_note:         { type: String, default: null, trim: true, maxlength: 500 },
    reviewed_at:           { type: Date, default: null },

    status: {
      type: String,
      enum: REVISION_STATUSES,
      default: "pending",
      index: true,
    },

    // Edit summary (shown in revision history like Wikipedia)
    edit_summary: { type: String, default: null, trim: true, maxlength: 300 },

    // Version number assigned when approved (matches Blog.versions index + 1)
    version_number: { type: Number, default: null },

    // Whether this revision is currently live (only one can be live at a time)
    is_live: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

articleRevisionSchema.index({ blog_slug: 1, status: 1, created_at: -1 });
articleRevisionSchema.index({ proposer_identity_key: 1, created_at: -1 });
articleRevisionSchema.index({ status: 1, created_at: -1 }); // admin review queue

export type ArticleRevisionSchemaType = InferSchemaType<typeof articleRevisionSchema>;
export type ArticleRevisionModelType = Model<ArticleRevisionSchemaType>;

export const ArticleRevisionModel: ArticleRevisionModelType =
  (mongoose.models["ArticleRevision"] as ArticleRevisionModelType | undefined) ??
  mongoose.model<ArticleRevisionSchemaType>("ArticleRevision", articleRevisionSchema);
