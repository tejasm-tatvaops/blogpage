import { z } from "zod";
import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { StoryHighlightModel, type StoryHighlightSchemaType } from "@/models/StoryHighlight";
import { StoryModel } from "@/models/Story";
import type { Story } from "./storyService";

export type StoryHighlight = {
  id: string;
  identity_key: string;
  display_name: string;
  avatar_url: string | null;
  title: string;
  icon: string;
  cover_story_id: string | null;
  story_ids: string[];
  position: number;
  created_at: string;
};

export const createHighlightSchema = z.object({
  title: z.string().min(1).max(40).trim(),
  icon: z
    .enum(["hardhat", "blueprint", "concrete", "safety", "tools", "site", "water", "electric", "structure", "inspection"])
    .optional()
    .default("hardhat"),
  story_ids: z.array(z.string()).max(50).optional().default([]),
  cover_story_id: z.string().nullable().optional(),
  display_name: z.string().min(1).max(80).trim(),
  avatar_url: z.string().url().nullable().optional(),
});

export type CreateHighlightInput = z.infer<typeof createHighlightSchema>;

function docToHighlight(doc: StoryHighlightSchemaType & { _id: { toString(): string }; created_at: Date }): StoryHighlight {
  return {
    id: doc._id.toString(),
    identity_key: doc.identity_key as string,
    display_name: doc.display_name as string,
    avatar_url: (doc.avatar_url as string | null) ?? null,
    title: doc.title as string,
    icon: (doc.icon as string) ?? "hardhat",
    cover_story_id: (doc.cover_story_id as string | null) ?? null,
    story_ids: (doc.story_ids as string[]) ?? [],
    position: (doc.position as number) ?? 0,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

export async function getHighlightsForUser(identityKey: string): Promise<StoryHighlight[]> {
  await connectToDatabase();
  const docs = await StoryHighlightModel.find({ identity_key: identityKey, deleted_at: null })
    .sort({ position: 1, created_at: 1 })
    .lean();
  return (docs as unknown as Parameters<typeof docToHighlight>[0][]).map(docToHighlight);
}

export async function createHighlight(
  identityKey: string,
  input: CreateHighlightInput,
): Promise<StoryHighlight> {
  await connectToDatabase();

  // Determine position (append at end)
  const count = await StoryHighlightModel.countDocuments({ identity_key: identityKey, deleted_at: null });

  const doc = await StoryHighlightModel.create({
    identity_key: identityKey,
    display_name: input.display_name,
    avatar_url: input.avatar_url ?? null,
    title: input.title,
    icon: input.icon,
    story_ids: input.story_ids ?? [],
    cover_story_id: input.cover_story_id ?? null,
    position: count,
  });

  logger.info({ id: doc._id.toString(), identityKey }, "Story highlight created");
  return docToHighlight(doc as unknown as Parameters<typeof docToHighlight>[0]);
}

export async function addStoryToHighlight(
  highlightId: string,
  storyId: string,
  identityKey: string,
): Promise<boolean> {
  await connectToDatabase();
  const result = await StoryHighlightModel.updateOne(
    { _id: highlightId, identity_key: identityKey, deleted_at: null },
    { $addToSet: { story_ids: storyId } },
  );
  return result.modifiedCount > 0;
}

export async function removeStoryFromHighlight(
  highlightId: string,
  storyId: string,
  identityKey: string,
): Promise<boolean> {
  await connectToDatabase();
  const result = await StoryHighlightModel.updateOne(
    { _id: highlightId, identity_key: identityKey, deleted_at: null },
    { $pull: { story_ids: storyId } },
  );
  return result.modifiedCount > 0;
}

export async function deleteHighlight(
  highlightId: string,
  identityKey: string,
): Promise<boolean> {
  await connectToDatabase();
  const result = await StoryHighlightModel.updateOne(
    { _id: highlightId, identity_key: identityKey, deleted_at: null },
    { $set: { deleted_at: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function getHighlightStories(highlightId: string): Promise<Story[]> {
  await connectToDatabase();

  const highlight = await StoryHighlightModel.findById(highlightId).lean();
  if (!highlight) return [];

  const storyIds = (highlight as unknown as StoryHighlightSchemaType).story_ids ?? [];
  if (storyIds.length === 0) return [];

  // Fetch stories — these can be expired (highlights persist past 24h TTL)
  const docs = await StoryModel.find({
    _id: { $in: storyIds },
    deleted_at: null,
  })
    .sort({ created_at: -1 })
    .lean();

  return (docs as unknown[]).map((doc) => {
    const d = doc as Record<string, unknown> & { _id: { toString(): string }; created_at: Date; expires_at: Date };
    return {
      id: d._id.toString(),
      identity_key: String(d.identity_key ?? ""),
      display_name: String(d.display_name ?? ""),
      avatar_url: (d.avatar_url as string | null) ?? null,
      author_reputation_tier: String(d.author_reputation_tier ?? "member"),
      story_type: String(d.story_type ?? "text") as Story["story_type"],
      media_url: (d.media_url as string | null) ?? null,
      media_type: (d.media_type as string | null) ?? null,
      text: (d.text as string | null) ?? null,
      background_style: String(d.background_style ?? "gradient-slate"),
      poll_question: (d.poll_question as string | null) ?? null,
      poll_options: (d.poll_options as Story["poll_options"]) ?? [],
      tags: (d.tags as string[]) ?? [],
      topic_category: (d.topic_category as string | null) ?? null,
      location: (d.location as string | null) ?? null,
      linked_blog_slug: (d.linked_blog_slug as string | null) ?? null,
      linked_forum_slug: (d.linked_forum_slug as string | null) ?? null,
      visibility: String(d.visibility ?? "public"),
      expires_at: new Date(d.expires_at).toISOString(),
      created_at: new Date(d.created_at).toISOString(),
      views_count: Number(d.views_count ?? 0),
      reactions_count: Number(d.reactions_count ?? 0),
      reply_count: Number(d.reply_count ?? 0),
      completion_rate: Number(d.completion_rate ?? 0),
      ranking_score: Number(d.ranking_score ?? 0),
      ai_generated: Boolean(d.ai_generated ?? false),
      ai_caption: (d.ai_caption as string | null) ?? null,
      ai_hashtags: (d.ai_hashtags as string[]) ?? [],
    };
  });
}
