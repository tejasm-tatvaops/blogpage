import mongoose, { type InferSchemaType, type Model } from "mongoose";

const userFollowSchema = new mongoose.Schema(
  {
    follower_identity_key: { type: String, required: true, trim: true, index: true },
    following_identity_key: { type: String, required: true, trim: true, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

userFollowSchema.index(
  { follower_identity_key: 1, following_identity_key: 1 },
  { unique: true, name: "uniq_follow_pair" },
);
userFollowSchema.index({ following_identity_key: 1, created_at: -1 });

userFollowSchema.pre("validate", function preventSelfFollow(next) {
  const follower = String(this.get("follower_identity_key") ?? "").trim();
  const following = String(this.get("following_identity_key") ?? "").trim();
  if (follower && following && follower === following) {
    next(new Error("Users cannot follow themselves."));
    return;
  }
  next();
});

export type UserFollowSchemaType = InferSchemaType<typeof userFollowSchema>;
export type UserFollowModelType = Model<UserFollowSchemaType>;

export const UserFollowModel: UserFollowModelType =
  (mongoose.models["UserFollow"] as UserFollowModelType | undefined) ??
  mongoose.model<UserFollowSchemaType>("UserFollow", userFollowSchema);
