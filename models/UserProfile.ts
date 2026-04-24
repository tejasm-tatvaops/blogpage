import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { USER_BEHAVIOR_TYPES, USER_WRITING_TONES } from "@/lib/userBehavior";

/**
 * Reputation tiers — unlocked by cumulative reputation_score:
 *   member      :   0 –  99  (default for new users)
 *   contributor : 100 – 499
 *   expert      : 500 – 1999
 *   elite       : 2000+       (unlocks exclusive forum club access)
 */
export const REPUTATION_TIERS = ["member", "contributor", "expert", "elite"] as const;
export type ReputationTier = (typeof REPUTATION_TIERS)[number];

export const REPUTATION_THRESHOLDS: Record<ReputationTier, number> = {
  member: 0,
  contributor: 100,
  expert: 500,
  elite: 2000,
};

export const getReputationTier = (score: number): ReputationTier => {
  if (score >= REPUTATION_THRESHOLDS.elite) return "elite";
  if (score >= REPUTATION_THRESHOLDS.expert) return "expert";
  if (score >= REPUTATION_THRESHOLDS.contributor) return "contributor";
  return "member";
};

const userProfileSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, unique: true, trim: true, index: true },
    fingerprint_id: { type: String, default: null, trim: true, index: true },
    ip_address: { type: String, default: null, trim: true, index: true },
    display_name: { type: String, required: true, trim: true, maxlength: 120 },
    about: { type: String, required: true, trim: true, maxlength: 280 },
    avatar_url: { type: String, required: true, trim: true, maxlength: 500 },

    // ── Activity counters ─────────────────────────────────────────────────────
    blog_views: { type: Number, default: 0 },
    forum_views: { type: Number, default: 0 },
    blog_comments: { type: Number, default: 0 },
    forum_posts: { type: Number, default: 0 },
    forum_comments: { type: Number, default: 0 },
    forum_votes: { type: Number, default: 0 },
    blog_likes: { type: Number, default: 0 }, // upvotes cast on blog posts

    // ── Persona: weighted interest vector ─────────────────────────────────────
    // Keys are normalised tag/category strings; values are float weights (0–100).
    // Updated by personaService on every meaningful interaction.
    // Stored as a plain object (not Map) for lean-query compatibility.
    interest_tags: { type: mongoose.Schema.Types.Mixed, default: {} },
    // User-specific affinity toward authors. Keys are normalised author ids.
    author_affinity: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Tracks the last explicit interest/affinity interaction for faster decay handling.
    last_interest_interaction_at: { type: Date, default: Date.now, index: true },
    behavior_type: {
      type: String,
      enum: USER_BEHAVIOR_TYPES,
      default: "casual",
      index: true,
    },
    writing_tone: {
      type: String,
      enum: USER_WRITING_TONES,
      default: "casual",
    },
    active_start_hour: { type: Number, default: 9, min: 0, max: 23 },
    active_end_hour: { type: Number, default: 19, min: 0, max: 23 },
    weekend_activity_multiplier: { type: Number, default: 1, min: 0.25, max: 2.5 },
    burstiness: { type: Number, default: 0.3, min: 0, max: 1 },
    silence_bias: { type: Number, default: 0.4, min: 0, max: 1 },
    emoji_level: { type: Number, default: 1, min: 0, max: 3 },
    social_cluster: { type: String, default: "cluster-1", trim: true, maxlength: 50, index: true },
    frequent_peer_keys: { type: [String], default: [] },
    topic_focus_history: { type: [String], default: [] },
    topic_shift_count: { type: Number, default: 0 },

    // ── Reputation (forum + cross-platform) ───────────────────────────────────
    reputation_score: { type: Number, default: 0, min: 0, index: true },
    reputation_tier: {
      type: String,
      enum: REPUTATION_TIERS,
      default: "member",
      index: true,
    },
    forum_badges: { type: [String], default: [] },
    forum_posting_streak_days: { type: Number, default: 0, min: 0 },
    forum_quality_streak_days: { type: Number, default: 0, min: 0 },
    forum_last_posted_at: { type: Date, default: null },

    // ── User classification ───────────────────────────────────────────────────
    // REAL = authenticated (google:), ANONYMOUS = human guest (fp:/ip:), SYSTEM = seeded/imported profile
    user_type: { type: String, enum: ["REAL", "ANONYMOUS", "SYSTEM"], default: "ANONYMOUS", index: true },

    // ── Navigation breadcrumbs ────────────────────────────────────────────────
    last_blog_slug: { type: String, default: null, trim: true },
    last_forum_slug: { type: String, default: null, trim: true },
    last_seen_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

userProfileSchema.index({ created_at: -1 });
userProfileSchema.index({ blog_views: -1, last_seen_at: -1 });
userProfileSchema.index({ forum_posts: -1, forum_comments: -1, last_seen_at: -1 });
userProfileSchema.index({ reputation_score: -1, last_seen_at: -1 }); // leaderboard queries
userProfileSchema.index({ behavior_type: 1, social_cluster: 1, last_seen_at: -1 });

export type UserProfileSchemaType = InferSchemaType<typeof userProfileSchema>;
export type UserProfileModelType = Model<UserProfileSchemaType>;

export const UserProfileModel: UserProfileModelType =
  (mongoose.models["UserProfile"] as UserProfileModelType | undefined) ??
  mongoose.model<UserProfileSchemaType>("UserProfile", userProfileSchema);
