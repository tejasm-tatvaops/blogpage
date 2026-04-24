import mongoose, { type InferSchemaType, type Model } from "mongoose";

const verificationCodeSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ["email", "phone"], required: true, index: true },
    target: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, minlength: 6, maxlength: 6 },
    expires_at: { type: Date, required: true, index: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

verificationCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
verificationCodeSchema.index({ identity_key: 1, type: 1, target: 1 });

export type VerificationCodeSchemaType = InferSchemaType<typeof verificationCodeSchema>;
export type VerificationCodeModelType = Model<VerificationCodeSchemaType>;

export const VerificationCodeModel: VerificationCodeModelType =
  (mongoose.models["VerificationCode"] as VerificationCodeModelType | undefined) ??
  mongoose.model<VerificationCodeSchemaType>("VerificationCode", verificationCodeSchema);
