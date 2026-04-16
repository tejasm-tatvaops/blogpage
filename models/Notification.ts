import mongoose, { type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["reply", "comment", "vote"], required: true, index: true },
    post_id: { type: String, required: true },
    comment_id: { type: String, default: null, index: true },
    recipient_key: { type: String, required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 400 },
    is_read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

notificationSchema.index({ post_id: 1 });
notificationSchema.index({ created_at: -1 });
notificationSchema.index({ recipient_key: 1, is_read: 1, created_at: -1 });

export type NotificationSchemaType = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = NotificationSchemaType & {
  _id: { toString(): string };
  created_at: Date;
};

export type NotificationModelType = Model<NotificationSchemaType>;

export const NotificationModel: NotificationModelType =
  (mongoose.models["Notification"] as NotificationModelType | undefined) ??
  mongoose.model<NotificationSchemaType>("Notification", notificationSchema);
