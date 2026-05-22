import { z } from "zod";
import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { StoryModel, type StoryDocument, type StoryType } from "@/models/Story";
import { StoryViewModel } from "@/models/StoryView";
import { StoryReactionModel, type StoryReactionType } from "@/models/StoryReaction";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Story = {
  id: string;
  identity_key: string;
  display_name: string;
  avatar_url: string | null;
  author_reputation_tier: string;
  story_type: StoryType;
  media_url: string | null;
  media_type: string | null;
  text: string | null;
  background_style: string;
  poll_question: string | null;
  poll_options: { text: string; votes: number }[];
  tags: string[];
  topic_category: string | null;
  location: string | null;
  linked_blog_slug: string | null;
  linked_forum_slug: string | null;
  visibility: string;
  expires_at: string;
  created_at: string;
  views_count: number;
  reactions_count: number;
  reply_count: number;
  completion_rate: number;
  ranking_score: number;
  ai_generated: boolean;
  ai_caption: string | null;
  ai_hashtags: string[];
  // Viewer-specific fields, populated when identity is known
  has_viewed?: boolean;
  viewer_reaction?: StoryReactionType | null;
};

// ─── Input schemas ─────────────────────────────────────────────────────────────

export const createStoryInputSchema = z.object({
  display_name: z.string().min(1).max(80).trim(),
  avatar_url: z.string().url().nullable().optional(),
  story_type: z.enum(["image", "video", "text", "poll", "link"]),
  media_url: z.string().url().nullable().optional(),
  media_type: z.enum(["image", "video"]).nullable().optional(),
  text: z.string().max(500).nullable().optional(),
  background_style: z.string().max(60).optional().default("gradient-slate"),
  poll_question: z.string().max(200).nullable().optional(),
  poll_options: z
    .array(z.object({ text: z.string().max(120).min(1) }))
    .max(4)
    .optional(),
  tags: z.array(z.string().max(40)).max(10).optional().default([]),
  topic_category: z.string().max(60).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  linked_blog_slug: z.string().max(200).nullable().optional(),
  linked_forum_slug: z.string().max(200).nullable().optional(),
  visibility: z.enum(["public", "followers"]).optional().default("public"),
  ai_generated: z.boolean().optional().default(false),
  ai_caption: z.string().max(300).nullable().optional(),
  ai_hashtags: z.array(z.string().max(40)).max(10).optional().default([]),
});

export type CreateStoryInput = z.infer<typeof createStoryInputSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TTL_HOURS = 24;

function docToStory(doc: StoryDocument): Story {
  return {
    id: doc._id.toString(),
    identity_key: doc.identity_key as string,
    display_name: doc.display_name as string,
    avatar_url: (doc.avatar_url as string | null) ?? null,
    author_reputation_tier: (doc.author_reputation_tier as string) ?? "member",
    story_type: doc.story_type as StoryType,
    media_url: (doc.media_url as string | null) ?? null,
    media_type: (doc.media_type as string | null) ?? null,
    text: (doc.text as string | null) ?? null,
    background_style: (doc.background_style as string) ?? "gradient-slate",
    poll_question: (doc.poll_question as string | null) ?? null,
    poll_options: (doc.poll_options as { text: string; votes: number }[]) ?? [],
    tags: (doc.tags as string[]) ?? [],
    topic_category: (doc.topic_category as string | null) ?? null,
    location: (doc.location as string | null) ?? null,
    linked_blog_slug: (doc.linked_blog_slug as string | null) ?? null,
    linked_forum_slug: (doc.linked_forum_slug as string | null) ?? null,
    visibility: (doc.visibility as string) ?? "public",
    expires_at: new Date(doc.expires_at as Date).toISOString(),
    created_at: new Date(doc.created_at as Date).toISOString(),
    views_count: (doc.views_count as number) ?? 0,
    reactions_count: (doc.reactions_count as number) ?? 0,
    reply_count: (doc.reply_count as number) ?? 0,
    completion_rate: (doc.completion_rate as number) ?? 0,
    ranking_score: (doc.ranking_score as number) ?? 0,
    ai_generated: (doc.ai_generated as boolean) ?? false,
    ai_caption: (doc.ai_caption as string | null) ?? null,
    ai_hashtags: (doc.ai_hashtags as string[]) ?? [],
  };
}

function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createStory(
  identityKey: string,
  input: CreateStoryInput,
): Promise<Story> {
  await connectToDatabase();

  // Enforce one active story per user — soft-delete any existing ones first
  await StoryModel.updateMany(
    { identity_key: identityKey, deleted_at: null, expires_at: { $gt: new Date() } },
    { $set: { deleted_at: new Date() } },
  );

  const expiresAt = nowPlusHours(TTL_HOURS);
  const pollOptions = (input.poll_options ?? []).map((o) => ({
    text: o.text,
    votes: 0,
  }));

  const doc = await StoryModel.create({
    identity_key: identityKey,
    display_name: input.display_name,
    avatar_url: input.avatar_url ?? null,
    story_type: input.story_type,
    media_url: input.media_url ?? null,
    media_type: input.media_type ?? null,
    text: input.text ?? null,
    background_style: input.background_style ?? "gradient-slate",
    poll_question: input.poll_question ?? null,
    poll_options: pollOptions,
    tags: input.tags ?? [],
    topic_category: input.topic_category ?? null,
    location: input.location ?? null,
    linked_blog_slug: input.linked_blog_slug ?? null,
    linked_forum_slug: input.linked_forum_slug ?? null,
    visibility: input.visibility ?? "public",
    expires_at: expiresAt,
    ai_generated: input.ai_generated ?? false,
    ai_caption: input.ai_caption ?? null,
    ai_hashtags: input.ai_hashtags ?? [],
    ranking_score: 0,
  });

  logger.info({ id: doc._id.toString(), identity_key: identityKey }, "Story created");
  return docToStory(doc as unknown as StoryDocument);
}

// ─── Fetch single ─────────────────────────────────────────────────────────────

export async function getStoryById(
  storyId: string,
  viewerIdentityKey?: string,
): Promise<Story | null> {
  await connectToDatabase();

  const doc = await StoryModel.findOne({
    _id: storyId,
    deleted_at: null,
    expires_at: { $gt: new Date() },
  }).lean();

  if (!doc) return null;

  const story = docToStory(doc as unknown as StoryDocument);

  if (viewerIdentityKey) {
    const [viewDoc, reactionDoc] = await Promise.all([
      StoryViewModel.findOne({
        story_id: storyId,
        viewer_identity_key: viewerIdentityKey,
      }).lean(),
      StoryReactionModel.findOne({
        story_id: storyId,
        identity_key: viewerIdentityKey,
      }).lean(),
    ]);
    story.has_viewed = !!viewDoc;
    story.viewer_reaction = reactionDoc
      ? (reactionDoc.reaction_type as StoryReactionType)
      : null;
  }

  return story;
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function deleteStory(
  storyId: string,
  identityKey: string,
): Promise<boolean> {
  await connectToDatabase();

  const result = await StoryModel.updateOne(
    { _id: storyId, identity_key: identityKey, deleted_at: null },
    { $set: { deleted_at: new Date() } },
  );

  return result.modifiedCount > 0;
}

// ─── Record view ──────────────────────────────────────────────────────────────

export async function recordStoryView(
  storyId: string,
  viewerIdentityKey: string,
  dwellTimeMs: number,
  completed: boolean,
): Promise<void> {
  await connectToDatabase();

  try {
    await StoryViewModel.updateOne(
      { story_id: storyId, viewer_identity_key: viewerIdentityKey },
      {
        $setOnInsert: { story_id: storyId, viewer_identity_key: viewerIdentityKey },
        $set: { viewed_at: new Date(), dwell_time_ms: dwellTimeMs, completed },
      },
      { upsert: true },
    );

    // Increment view counter on new views only (use $inc with conditional)
    await StoryModel.updateOne(
      { _id: storyId, deleted_at: null },
      { $inc: { views_count: 1 } },
    );

    // Update completion rate after new view
    const [totalViews, completedViews] = await Promise.all([
      StoryViewModel.countDocuments({ story_id: storyId }),
      StoryViewModel.countDocuments({ story_id: storyId, completed: true }),
    ]);

    const completionRate = totalViews > 0 ? completedViews / totalViews : 0;
    await StoryModel.updateOne(
      { _id: storyId },
      { $set: { completion_rate: completionRate } },
    );
  } catch (err) {
    // Duplicate key = already viewed, silently ignore
    if ((err as { code?: number }).code !== 11000) {
      logger.error({ err, storyId, viewerIdentityKey }, "recordStoryView error");
    }
  }
}

// ─── Record reaction ──────────────────────────────────────────────────────────

export async function reactToStory(
  storyId: string,
  identityKey: string,
  reactionType: StoryReactionType,
): Promise<{ added: boolean }> {
  await connectToDatabase();

  try {
    await StoryReactionModel.create({
      story_id: storyId,
      identity_key: identityKey,
      reaction_type: reactionType,
    });

    await StoryModel.updateOne(
      { _id: storyId, deleted_at: null },
      { $inc: { reactions_count: 1 } },
    );

    return { added: true };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      // Toggle off — remove existing reaction
      await StoryReactionModel.deleteOne({
        story_id: storyId,
        identity_key: identityKey,
        reaction_type: reactionType,
      });
      await StoryModel.updateOne(
        { _id: storyId, deleted_at: null },
        { $inc: { reactions_count: -1 } },
      );
      return { added: false };
    }
    throw err;
  }
}

// ─── Increment reply count ─────────────────────────────────────────────────────

export async function incrementStoryReplyCount(storyId: string): Promise<void> {
  await connectToDatabase();
  await StoryModel.updateOne(
    { _id: storyId, deleted_at: null },
    { $inc: { reply_count: 1 } },
  );
}

// ─── Get active stories by identity (for "your story" rail item) ──────────────

export async function getActiveStoriesForUser(identityKey: string): Promise<Story[]> {
  await connectToDatabase();

  const docs = await StoryModel.find({
    identity_key: identityKey,
    deleted_at: null,
    expires_at: { $gt: new Date() },
  })
    .sort({ created_at: -1 })
    .lean();

  return (docs as unknown as StoryDocument[]).map(docToStory);
}

// ─── Fetch raw active docs for ranking ────────────────────────────────────────

export async function getActiveStoriesRaw(limit = 200): Promise<Story[]> {
  await connectToDatabase();

  const docs = await StoryModel.find({
    deleted_at: null,
    expires_at: { $gt: new Date() },
    visibility: "public",
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  return (docs as unknown as StoryDocument[]).map(docToStory);
}

// ─── Tag-filtered stories (for topic pages / blog+forum integration) ──────────

export async function getStoriesForTag(
  tag: string,
  limit = 20,
): Promise<Story[]> {
  await connectToDatabase();

  const docs = await StoryModel.find({
    tags: tag,
    deleted_at: null,
    expires_at: { $gt: new Date() },
    visibility: "public",
  })
    .sort({ ranking_score: -1, created_at: -1 })
    .limit(limit)
    .lean();

  return (docs as unknown as StoryDocument[]).map(docToStory);
}

// ─── Stories linked to a blog slug ────────────────────────────────────────────

export async function getStoriesForBlog(
  blogSlug: string,
  limit = 10,
): Promise<Story[]> {
  await connectToDatabase();

  const docs = await StoryModel.find({
    linked_blog_slug: blogSlug,
    deleted_at: null,
    expires_at: { $gt: new Date() },
    visibility: "public",
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  return (docs as unknown as StoryDocument[]).map(docToStory);
}

// ─── Stories linked to a forum slug ───────────────────────────────────────────

export async function getStoriesForForum(
  forumSlug: string,
  limit = 10,
): Promise<Story[]> {
  await connectToDatabase();

  const docs = await StoryModel.find({
    linked_forum_slug: forumSlug,
    deleted_at: null,
    expires_at: { $gt: new Date() },
    visibility: "public",
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  return (docs as unknown as StoryDocument[]).map(docToStory);
}

// ─── Vote on poll ─────────────────────────────────────────────────────────────

export async function votePollOption(
  storyId: string,
  optionIndex: number,
  identityKey: string,
): Promise<{ options: { text: string; votes: number }[] } | null> {
  await connectToDatabase();

  // Re-use reaction table to prevent double voting (reaction_type = "poll_N")
  const voteKey = `poll_${optionIndex}` as StoryReactionType;
  const alreadyVoted = await StoryReactionModel.findOne({
    story_id: storyId,
    identity_key: identityKey,
    reaction_type: voteKey,
  });
  if (alreadyVoted) return null;

  const updateKey = `poll_options.${optionIndex}.votes`;
  const doc = await StoryModel.findOneAndUpdate(
    { _id: storyId, deleted_at: null, expires_at: { $gt: new Date() } },
    { $inc: { [updateKey]: 1 } },
    { new: true },
  ).lean();

  if (!doc) return null;

  // Record vote for dedup
  await StoryReactionModel.create({
    story_id: storyId,
    identity_key: identityKey,
    reaction_type: voteKey,
  }).catch(() => undefined);

  return { options: (doc as unknown as StoryDocument).poll_options as { text: string; votes: number }[] };
}

// ─── Update ranking score (called by storyRanking.ts) ─────────────────────────

export async function updateStoryRankingScore(
  storyId: string,
  score: number,
): Promise<void> {
  await connectToDatabase();
  await StoryModel.updateOne({ _id: storyId }, { $set: { ranking_score: score } });
}
