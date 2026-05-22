/**
 * Story Notification Service
 *
 * Fires notifications for:
 *   story_reply      — someone replied to your story
 *   story_reaction   — someone reacted to your story
 *   story_poll_vote  — your poll received a vote (batched: fires at 10, 25, 50, 100)
 *
 * Uses the existing Notification model to keep the notification pipeline unified.
 */

import { connectToDatabase } from "./mongodb";
import { logger } from "./logger";
import { NotificationModel } from "@/models/Notification";
import { StoryModel } from "@/models/Story";

const POLL_MILESTONES = [10, 25, 50, 100, 250, 500];

const REACTION_LABELS: Record<string, string> = {
  fire: "🔥 reacted with fire",
  clap: "👏 applauded",
  insightful: "💡 found it insightful",
  question: "❓ has a question about",
  heart: "❤️ loved",
};

// ─── Reply notification ───────────────────────────────────────────────────────

export async function notifyStoryReply(
  storyId: string,
  replierDisplayName: string,
  replyText: string,
): Promise<void> {
  await connectToDatabase();

  const story = await StoryModel.findById(storyId).select("identity_key display_name").lean();
  if (!story) return;

  const recipientKey = String((story as { identity_key?: string }).identity_key ?? "");
  if (!recipientKey) return;

  const preview = replyText.slice(0, 80);

  try {
    await NotificationModel.create({
      type: "story_reply",
      post_id: storyId,
      recipient_key: recipientKey,
      message: `${replierDisplayName} replied to your story: "${preview}"`,
      is_read: false,
    });
  } catch (err) {
    logger.warn({ err, storyId }, "notifyStoryReply: failed to create notification");
  }
}

// ─── Reaction notification ────────────────────────────────────────────────────

export async function notifyStoryReaction(
  storyId: string,
  reactorDisplayName: string,
  reactionType: string,
): Promise<void> {
  await connectToDatabase();

  const story = await StoryModel.findById(storyId)
    .select("identity_key display_name text")
    .lean();
  if (!story) return;

  const recipientKey = String((story as { identity_key?: string }).identity_key ?? "");
  if (!recipientKey) return;

  const label = REACTION_LABELS[reactionType] ?? "reacted to";
  const preview = String((story as { text?: string }).text ?? "").slice(0, 50);

  try {
    await NotificationModel.create({
      type: "story_reaction",
      post_id: storyId,
      recipient_key: recipientKey,
      message: `${reactorDisplayName} ${label} your story${preview ? `: "${preview}"` : ""}`,
      is_read: false,
    });
  } catch (err) {
    logger.warn({ err, storyId }, "notifyStoryReaction: failed to create notification");
  }
}

// ─── Poll vote milestone notification ────────────────────────────────────────

export async function notifyPollMilestone(
  storyId: string,
  totalVotes: number,
): Promise<void> {
  if (!POLL_MILESTONES.includes(totalVotes)) return;

  await connectToDatabase();

  const story = await StoryModel.findById(storyId)
    .select("identity_key poll_question")
    .lean();
  if (!story) return;

  const recipientKey = String((story as { identity_key?: string }).identity_key ?? "");
  const pollQ = String((story as { poll_question?: string }).poll_question ?? "your poll");

  try {
    await NotificationModel.create({
      type: "story_poll_vote",
      post_id: storyId,
      recipient_key: recipientKey,
      message: `🗳️ ${totalVotes} engineers voted on "${pollQ.slice(0, 60)}"`,
      is_read: false,
    });
  } catch (err) {
    logger.warn({ err, storyId }, "notifyPollMilestone: failed to create notification");
  }
}
