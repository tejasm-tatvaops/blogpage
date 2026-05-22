/**
 * StoryHighlight — persistent curated collections of stories.
 *
 * Unlike regular stories (24h TTL), highlights are permanent showcases.
 * A user can pin past stories into named highlight reels that appear
 * beneath their profile and on the stories rail as a persistent ring.
 *
 * Examples:
 *   "Site Progress"   "Safety Tips"   "Concrete Testing"   "MEP Workflows"
 */
import mongoose, { type InferSchemaType, type Model } from "mongoose";

const HIGHLIGHT_ICONS = [
  "hardhat", "blueprint", "concrete", "safety", "tools",
  "site", "water", "electric", "structure", "inspection",
] as const;

const storyHighlightSchema = new mongoose.Schema(
  {
    identity_key: { type: String, required: true, trim: true, index: true },
    display_name: { type: String, required: true, trim: true, maxlength: 80 },
    avatar_url: { type: String, default: null, trim: true },

    // Highlight metadata
    title: { type: String, required: true, trim: true, maxlength: 40 },
    icon: { type: String, enum: HIGHLIGHT_ICONS, default: "hardhat" },
    cover_story_id: { type: String, default: null },

    // Ordered list of story IDs included in this highlight
    story_ids: { type: [String], default: [] },

    // Soft delete
    deleted_at: { type: Date, default: null },

    // Position in the user's highlight list (0-indexed)
    position: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  },
);

storyHighlightSchema.index({ identity_key: 1, deleted_at: 1, position: 1 });

export type StoryHighlightSchemaType = InferSchemaType<typeof storyHighlightSchema>;
export type StoryHighlightModelType = Model<StoryHighlightSchemaType>;

export const HIGHLIGHT_ICON_OPTIONS = HIGHLIGHT_ICONS;

export const StoryHighlightModel: StoryHighlightModelType =
  (mongoose.models["StoryHighlight"] as StoryHighlightModelType | undefined) ??
  mongoose.model<StoryHighlightSchemaType>("StoryHighlight", storyHighlightSchema);
