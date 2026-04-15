import mongoose, { type InferSchemaType, type Model } from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

// No explicit email index needed — the field-level unique:true already creates it.
subscriberSchema.index({ active: 1, created_at: -1 });

export type SubscriberSchemaType = InferSchemaType<typeof subscriberSchema>;
export type SubscriberModelType = Model<SubscriberSchemaType>;

export const SubscriberModel: SubscriberModelType =
  (mongoose.models["Subscriber"] as SubscriberModelType | undefined) ??
  mongoose.model<SubscriberSchemaType>("Subscriber", subscriberSchema);
