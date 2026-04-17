import mongoose, { type InferSchemaType, type Model } from "mongoose";

const counterDriftEventSchema = new mongoose.Schema(
  {
    metric: { type: String, required: true, index: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: String, required: true, index: true },
    expected_value: { type: Number, required: true },
    actual_value: { type: Number, required: true },
    drift: { type: Number, required: true, index: true },
    severity: { type: String, enum: ["small", "large"], required: true, index: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    versionKey: false,
  },
);

counterDriftEventSchema.index({ created_at: -1, severity: 1 });
counterDriftEventSchema.index({ metric: 1, created_at: -1 });

export type CounterDriftEventSchemaType = InferSchemaType<typeof counterDriftEventSchema>;
export type CounterDriftEventModelType = Model<CounterDriftEventSchemaType>;

export const CounterDriftEventModel: CounterDriftEventModelType =
  (mongoose.models["CounterDriftEvent"] as CounterDriftEventModelType | undefined) ??
  mongoose.model<CounterDriftEventSchemaType>("CounterDriftEvent", counterDriftEventSchema);
