import mongoose, { type InferSchemaType, type Model } from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, unique: true, trim: true, index: true },
    fingerprint_id: { type: String, default: null, trim: true, index: true },
    ip_address: { type: String, default: null, trim: true, index: true },
    display_name: { type: String, required: true, trim: true, maxlength: 120 },
    about: { type: String, required: true, trim: true, maxlength: 280 },
    avatar_url: { type: String, required: true, trim: true, maxlength: 500 },
    blog_views: { type: Number, default: 0 },
    blog_comments: { type: Number, default: 0 },
    forum_posts: { type: Number, default: 0 },
    forum_comments: { type: Number, default: 0 },
    forum_votes: { type: Number, default: 0 },
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

export type UserProfileSchemaType = InferSchemaType<typeof userProfileSchema>;
export type UserProfileModelType = Model<UserProfileSchemaType>;

export const UserProfileModel: UserProfileModelType =
  (mongoose.models["UserProfile"] as UserProfileModelType | undefined) ??
  mongoose.model<UserProfileSchemaType>("UserProfile", userProfileSchema);
