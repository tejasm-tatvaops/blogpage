/**
 * Story Analytics API
 *
 * Returns per-story engagement metrics for the authenticated user's stories.
 * Powers the StoryAnalyticsDashboard component.
 */
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";
import { StoryReactionModel } from "@/models/StoryReaction";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type StoryAnalytic = {
  id: string;
  text: string | null;
  story_type: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  views_count: number;
  reactions_count: number;
  reply_count: number;
  completion_rate: number;
  ranking_score: number;
  tags: string[];
  reaction_breakdown: Record<string, number>;
};

export async function GET(request: Request) {
  try {
    const identityKey = await getIdentityKeyFromSessionOrRequest(request);
    await connectToDatabase();

    // Fetch last 30 stories (active + recently expired)
    const stories = await StoryModel.find({
      identity_key: identityKey,
      deleted_at: null,
    })
      .sort({ created_at: -1 })
      .limit(30)
      .lean();

    const now = new Date();

    const analytics: StoryAnalytic[] = await Promise.all(
      stories.map(async (s) => {
        const doc = s as unknown as {
          _id: { toString(): string };
          text?: string;
          story_type: string;
          created_at: Date;
          expires_at: Date;
          views_count: number;
          reactions_count: number;
          reply_count: number;
          completion_rate: number;
          ranking_score: number;
          tags: string[];
        };

        const storyId = doc._id.toString();

        // Reaction breakdown by type
        const reactionDocs = await StoryReactionModel.aggregate([
          { $match: { story_id: storyId } },
          { $group: { _id: "$reaction_type", count: { $sum: 1 } } },
        ]);

        const breakdown: Record<string, number> = {};
        for (const r of reactionDocs) {
          breakdown[String(r._id)] = Number(r.count);
        }

        return {
          id: storyId,
          text: doc.text ?? null,
          story_type: doc.story_type,
          created_at: new Date(doc.created_at).toISOString(),
          expires_at: new Date(doc.expires_at).toISOString(),
          is_expired: new Date(doc.expires_at) < now,
          views_count: doc.views_count ?? 0,
          reactions_count: doc.reactions_count ?? 0,
          reply_count: doc.reply_count ?? 0,
          completion_rate: doc.completion_rate ?? 0,
          ranking_score: doc.ranking_score ?? 0,
          tags: doc.tags ?? [],
          reaction_breakdown: breakdown,
        };
      }),
    );

    // Summary stats
    const totalViews = analytics.reduce((s, a) => s + a.views_count, 0);
    const totalReactions = analytics.reduce((s, a) => s + a.reactions_count, 0);
    const avgCompletion =
      analytics.length > 0
        ? analytics.reduce((s, a) => s + a.completion_rate, 0) / analytics.length
        : 0;

    return NextResponse.json({
      stories: analytics,
      summary: {
        total_stories: analytics.length,
        total_views: totalViews,
        total_reactions: totalReactions,
        avg_completion_rate: Math.round(avgCompletion * 100),
      },
    });
  } catch (error) {
    logger.error({ error }, "GET /api/stories/analytics error");
    return NextResponse.json({ error: "Failed to fetch analytics." }, { status: 500 });
  }
}
