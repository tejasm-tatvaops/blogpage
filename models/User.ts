import mongoose, { type InferSchemaType, type Model } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    image: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export type AuthUserSchemaType = InferSchemaType<typeof userSchema>;
export type AuthUserModelType = Model<AuthUserSchemaType>;

export const AuthUserModel: AuthUserModelType =
  (mongoose.models["AuthUser"] as AuthUserModelType | undefined) ??
  mongoose.model<AuthUserSchemaType>("AuthUser", userSchema);
