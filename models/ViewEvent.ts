import mongoose, { type InferSchemaType, type Model } from "mongoose";

const viewEventSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true, index: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", default: null, index: true },
    referrer_host: { type: String, default: "direct", trim: true, index: true },
    user_agent: { type: String, default: "", trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

viewEventSchema.index({ created_at: -1 });
viewEventSchema.index({ slug: 1, created_at: -1 });
viewEventSchema.index({ referrer_host: 1, created_at: -1 });

export type ViewEventSchemaType = InferSchemaType<typeof viewEventSchema>;
export type ViewEventModelType = Model<ViewEventSchemaType>;

export const ViewEventModel: ViewEventModelType =
  (mongoose.models["ViewEvent"] as ViewEventModelType | undefined) ??
  mongoose.model<ViewEventSchemaType>("ViewEvent", viewEventSchema);
