import mongoose, { type InferSchemaType, type Model } from "mongoose";

/**
 * Explicit topic preferences set by the user via the Personalize Feed modal.
 * Keyed by identity_key (fingerprint or IP), same as UserProfile.
 *
 * Separate from UserProfile.interest_tags (which is implicit, signal-based).
 * This model stores the user's *declared* intent and is used to apply
 * a deterministic boost/penalty on top of the existing ranking score.
 */
const userPreferencesSchema = new mongoose.Schema(
  {
    identity_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    /** Topics the user explicitly marked as Interested (👍). */
    interested_topics: { type: [String], default: [] },

    /** Topics the user explicitly marked as Not Interested (👎). */
    uninterested_topics: { type: [String], default: [] },

    /**
     * Whether personalization is active for this user.
     * Set to false if the user clicks "Continue Without Login" so
     * we can distinguish "dismissed modal" from "has preferences".
     */
    personalization_enabled: { type: Boolean, default: true },

    last_updated: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

userPreferencesSchema.index({ last_updated: -1 });

export type UserPreferencesSchemaType = InferSchemaType<typeof userPreferencesSchema>;
export type UserPreferencesModelType = Model<UserPreferencesSchemaType>;

export const UserPreferencesModel: UserPreferencesModelType =
  (mongoose.models["UserPreferences"] as UserPreferencesModelType | undefined) ??
  mongoose.model<UserPreferencesSchemaType>("UserPreferences", userPreferencesSchema);
