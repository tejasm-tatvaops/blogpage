/**
 * Story Feed Generator
 *
 * Builds the personalized story rail for a given viewer.
 *
 * Rail structure:
 *   [ViewerOwnStory] → [Unseen ranked stories] → [Seen stories]
 *
 * Viewer's own stories are always placed first (shown as "Your Story" bubble).
 */

import { connectToDatabase } from "./mongodb";
import { getActiveStoriesRaw, getActiveStoriesForUser, type Story } from "./storyService";
import { rankStories, persistRankingScores } from "./storyRanking";
import { UserProfileModel } from "@/models/UserProfile";
import { StoryViewModel } from "@/models/StoryView";

export type StoryFeedResult = {
  viewer_stories: Story[];
  feed_stories: Story[];
  total: number;
};

export async function getStoryFeed(
  viewerIdentityKey: string,
  limit = 30,
): Promise<StoryFeedResult> {
  await connectToDatabase();

  const [allActive, viewerStories, interestVector, viewedDocs] = await Promise.all([
    getActiveStoriesRaw(200),
    getActiveStoriesForUser(viewerIdentityKey),
    getInterestVector(viewerIdentityKey),
    getViewedStoryIds(viewerIdentityKey),
  ]);

  const seenStoryIds = new Set(viewedDocs);

  const ranked = rankStories(allActive, {
    interestVector,
    seenStoryIds,
    viewerIdentityKey,
    limit,
  });

  // Annotate has_viewed on each story
  const annotated = ranked.map((s) => ({
    ...s,
    has_viewed: seenStoryIds.has(s.id),
  }));

  // Persist scores in background (fire-and-forget)
  void persistRankingScores(ranked);

  return {
    viewer_stories: viewerStories,
    feed_stories: annotated,
    total: annotated.length,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getInterestVector(
  identityKey: string,
): Promise<Record<string, number>> {
  try {
    const profile = await UserProfileModel.findOne({ identity_key: identityKey })
      .select("interest_tags")
      .lean();
    return (profile as { interest_tags?: Record<string, number> } | null)?.interest_tags ?? {};
  } catch {
    return {};
  }
}

async function getViewedStoryIds(identityKey: string): Promise<string[]> {
  try {
    const docs = await StoryViewModel.find({
      viewer_identity_key: identityKey,
    })
      .select("story_id")
      .lean();
    return docs.map((d) => String((d as { story_id: string }).story_id));
  } catch {
    return [];
  }
}
