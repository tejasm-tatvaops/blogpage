import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * ReputationEvent — immutable point ledger entry.
 *
 * Every time a user earns or loses points an entry is created here.
 * This allows:
 *   - Full point history per user
 *   - Audit trail for anti-abuse reviews
 *   - Leaderboard recomputation from source of truth
 *
 * Cross-content multiplier: when source_content_type differs from
 * target_content_type the engine applies a 10× multiplier to base_points.
 * e.g. blog → short click = 10× on the short's engagement points.
 */
export const REP_EVENT_REASONS = [
  "article_view_received",       // someone read your blog
  "article_like_received",       // someone upvoted your blog
  "article_comment_received",    // someone commented on your blog
  "article_share_received",      // someone shared your blog
  "forum_post_created",          // you created a forum post
  "forum_answer_given",          // you answered (commented) in a forum
  "forum_upvote_received",       // someone upvoted your forum post/comment
  "forum_best_answer_awarded",   // your comment was marked as best answer
  "comment_upvote_received",     // someone upvoted your blog comment
  "short_viewed",                // someone watched your short
  "short_liked_received",        // someone liked your short
  "cross_content_link",          // you linked content across types (blog→forum etc.)
  "cross_content_engagement",    // cross-content engagement received (10× multiplier)
  "peer_helpful_vote",           // peers marked you as helpful
  "tutorial_completed",          // completed a tutorial
  "learning_path_completed",     // completed a full learning path
  "tutorial_peer_review",        // reviewed tutorial quality/feedback
  "tutorial_author_contribution",// authored a tutorial contribution
  "content_share",               // you shared content (outbound)
  "badge_unlock_bonus",          // bonus on badge unlock
  "anti_abuse_deduction",        // deducted for abuse pattern
  "manual_admin_adjustment",     // admin override
  "positive_feedback",           // positive mention / praise of TatvaOps
] as const;

export type RepEventReason = (typeof REP_EVENT_REASONS)[number];

export const REP_CONTENT_TYPES = ["blog", "forum", "short", "tutorial", "comment"] as const;
export type RepContentType = (typeof REP_CONTENT_TYPES)[number];

const reputationEventSchema = new mongoose.Schema(
  {
    // The user who earns/loses points
    identity_key: { type: String, required: true, trim: true, index: true },

    reason: { type: String, enum: REP_EVENT_REASONS, required: true, index: true },

    // Base points before multipliers; may be negative (deductions)
    base_points: { type: Number, required: true },

    // Multiplier applied (1 normally, 10 for cross-content, 0 for abuse block)
    multiplier: { type: Number, default: 1 },

    // Final awarded points = base_points × multiplier
    awarded_points: { type: Number, required: true },

    // Cumulative score after this event (snapshot for fast history display)
    running_total: { type: Number, default: 0 },

    // Content involved (nullable for non-content-specific events)
    source_content_type: { type: String, enum: REP_CONTENT_TYPES, default: null },
    source_content_slug: { type: String, default: null, trim: true },

    // Who triggered the event (e.g., the user who gave the upvote)
    actor_identity_key: { type: String, default: null, trim: true },

    // Human-readable note for admin UI
    note: { type: String, default: null, trim: true, maxlength: 300 },

    // Deterministic idempotency key to prevent duplicate awards on retries/replays.
    event_key: { type: String, default: null, trim: true, maxlength: 220 },

    // Flag: was this cross-content interaction?
    is_cross_content: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

reputationEventSchema.index({ identity_key: 1, created_at: -1 }); // history query
reputationEventSchema.index({ identity_key: 1, reason: 1, created_at: -1 }); // filtered history
reputationEventSchema.index({ source_content_slug: 1, reason: 1 }); // per-content analytics
reputationEventSchema.index({ is_cross_content: 1, created_at: -1 }); // cross-content report
reputationEventSchema.index({ actor_identity_key: 1, reason: 1, created_at: -1 }); // anti-abuse
reputationEventSchema.index(
  { event_key: 1 },
  { unique: true, partialFilterExpression: { event_key: { $type: "string" } } },
);

export type ReputationEventSchemaType = InferSchemaType<typeof reputationEventSchema>;
export type ReputationEventModelType = Model<ReputationEventSchemaType>;

export const ReputationEventModel: ReputationEventModelType =
  (mongoose.models["ReputationEvent"] as ReputationEventModelType | undefined) ??
  mongoose.model<ReputationEventSchemaType>("ReputationEvent", reputationEventSchema);
