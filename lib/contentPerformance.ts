/**
 * Content Performance — per-post, per-channel aggregation from FeedEvents.
 *
 * Reuses the existing FeedEvent collection. No new collection or model.
 * "share" events carry metadata.channel to split channel-level stats.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { FeedEventModel } from "@/models/FeedEvent";

export type ChannelShareCounts = {
  twitter: number;
  linkedin: number;
  whatsapp: number;
  email: number;
  instagram: number;
  threads: number;
  copy: number;
  other: number;
};

export type PostPerformance = {
  slug: string;
  clicks: number;
  reads: number;          // post_clicked events (proxy for reads)
  likes: number;
  totalDwellMs: number;
  avgDwellMs: number;
  shares: number;         // total share events
  sharesByChannel: ChannelShareCounts;
};

const EMPTY_CHANNELS: ChannelShareCounts = {
  twitter: 0,
  linkedin: 0,
  whatsapp: 0,
  email: 0,
  instagram: 0,
  threads: 0,
  copy: 0,
  other: 0,
};

/**
 * Returns performance metrics for a single post, reading from FeedEvents.
 *
 * @param slug - blog post slug
 * @param windowHours - how far back to look (default: all time = 0)
 */
export async function getPostPerformance(
  slug: string,
  windowHours = 0,
): Promise<PostPerformance> {
  await connectToDatabase();

  const match: Record<string, unknown> = { post_slug: slug };
  if (windowHours > 0) {
    match.created_at = { $gte: new Date(Date.now() - windowHours * 3_600_000) };
  }

  const [agg] = await FeedEventModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        clicks: { $sum: { $cond: [{ $eq: ["$event_type", "post_clicked"] }, 1, 0] } },
        likes: { $sum: { $cond: [{ $eq: ["$event_type", "post_liked"] }, 1, 0] } },
        dwellEvents: { $sum: { $cond: [{ $eq: ["$event_type", "dwell_time"] }, 1, 0] } },
        totalDwellMs: {
          $sum: {
            $cond: [{ $eq: ["$event_type", "dwell_time"] }, { $ifNull: ["$dwell_ms", 0] }, 0],
          },
        },
        shares: { $sum: { $cond: [{ $eq: ["$event_type", "share"] }, 1, 0] } },
        // Collect all channel values from share events
        shareChannels: {
          $push: {
            $cond: [
              { $eq: ["$event_type", "share"] },
              { $ifNull: ["$metadata.channel", "other"] },
              "$$REMOVE",
            ],
          },
        },
      },
    },
  ]);

  if (!agg) {
    return {
      slug,
      clicks: 0,
      reads: 0,
      likes: 0,
      totalDwellMs: 0,
      avgDwellMs: 0,
      shares: 0,
      sharesByChannel: { ...EMPTY_CHANNELS },
    };
  }

  const clicks = Number(agg.clicks ?? 0);
  const likes = Number(agg.likes ?? 0);
  const shares = Number(agg.shares ?? 0);
  const totalDwellMs = Number(agg.totalDwellMs ?? 0);
  const dwellEvents = Number(agg.dwellEvents ?? 0);
  const avgDwellMs = dwellEvents > 0 ? Math.round(totalDwellMs / dwellEvents) : 0;

  const sharesByChannel: ChannelShareCounts = { ...EMPTY_CHANNELS };
  for (const ch of (agg.shareChannels as string[]) ?? []) {
    const key = ch as keyof ChannelShareCounts;
    if (key in sharesByChannel) {
      sharesByChannel[key]++;
    } else {
      sharesByChannel.other++;
    }
  }

  return {
    slug,
    clicks,
    reads: clicks,
    likes,
    totalDwellMs,
    avgDwellMs,
    shares,
    sharesByChannel,
  };
}

/**
 * Returns performance for multiple posts in one aggregation query.
 * More efficient than calling getPostPerformance() in a loop.
 */
export async function getBulkPostPerformance(
  slugs: string[],
  windowHours = 0,
): Promise<Map<string, PostPerformance>> {
  if (slugs.length === 0) return new Map();

  await connectToDatabase();

  const match: Record<string, unknown> = { post_slug: { $in: slugs } };
  if (windowHours > 0) {
    match.created_at = { $gte: new Date(Date.now() - windowHours * 3_600_000) };
  }

  const rows = await FeedEventModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$post_slug",
        clicks: { $sum: { $cond: [{ $eq: ["$event_type", "post_clicked"] }, 1, 0] } },
        likes: { $sum: { $cond: [{ $eq: ["$event_type", "post_liked"] }, 1, 0] } },
        dwellEvents: { $sum: { $cond: [{ $eq: ["$event_type", "dwell_time"] }, 1, 0] } },
        totalDwellMs: {
          $sum: {
            $cond: [{ $eq: ["$event_type", "dwell_time"] }, { $ifNull: ["$dwell_ms", 0] }, 0],
          },
        },
        shares: { $sum: { $cond: [{ $eq: ["$event_type", "share"] }, 1, 0] } },
        shareChannels: {
          $push: {
            $cond: [
              { $eq: ["$event_type", "share"] },
              { $ifNull: ["$metadata.channel", "other"] },
              "$$REMOVE",
            ],
          },
        },
      },
    },
  ]);

  const result = new Map<string, PostPerformance>();

  for (const row of rows) {
    const slug = String(row._id ?? "");
    const clicks = Number(row.clicks ?? 0);
    const likes = Number(row.likes ?? 0);
    const shares = Number(row.shares ?? 0);
    const totalDwellMs = Number(row.totalDwellMs ?? 0);
    const dwellEvents = Number(row.dwellEvents ?? 0);
    const avgDwellMs = dwellEvents > 0 ? Math.round(totalDwellMs / dwellEvents) : 0;

    const sharesByChannel: ChannelShareCounts = { ...EMPTY_CHANNELS };
    for (const ch of (row.shareChannels as string[]) ?? []) {
      const key = ch as keyof ChannelShareCounts;
      if (key in sharesByChannel) sharesByChannel[key]++;
      else sharesByChannel.other++;
    }

    result.set(slug, { slug, clicks, reads: clicks, likes, totalDwellMs, avgDwellMs, shares, sharesByChannel });
  }

  // Fill in zeros for slugs with no events
  for (const slug of slugs) {
    if (!result.has(slug)) {
      result.set(slug, {
        slug, clicks: 0, reads: 0, likes: 0,
        totalDwellMs: 0, avgDwellMs: 0, shares: 0,
        sharesByChannel: { ...EMPTY_CHANNELS },
      });
    }
  }

  return result;
}

/**
 * Computes a single composite engagement score for a post.
 * Used for ranking digests and intelligent distribution.
 *
 *   score = clicks * 1 + likes * 3 + shares * 2 + avgDwellMin * 5
 */
export function computeEngagementScore(perf: PostPerformance): number {
  const avgDwellMin = perf.avgDwellMs / 60_000;
  return perf.clicks * 1 + perf.likes * 3 + perf.shares * 2 + avgDwellMin * 5;
}
