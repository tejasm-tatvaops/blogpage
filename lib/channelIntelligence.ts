/**
 * Channel Intelligence — simple heuristic that ranks distribution channels
 * by past share performance, reading from the FeedEvent collection.
 *
 * No new collection. Reads the existing "share" events (metadata.channel).
 *
 * Usage:
 *   const ranked = await getRankedChannels();
 *   // e.g. ["email", "twitter", "linkedin", "threads", "whatsapp", "instagram"]
 *
 *   const channels = ranked.slice(0, 3); // top-3 performers
 *   await distributeContent(post, channels);
 */

import { connectToDatabase } from "@/lib/mongodb";
import { FeedEventModel } from "@/models/FeedEvent";
import type { ChannelName } from "@/channels/distributor";

const ALL_CHANNELS: ChannelName[] = [
  "email",
  "twitter",
  "linkedin",
  "threads",
  "whatsapp",
  "instagram",
];

export type ChannelScore = {
  channel: ChannelName;
  shares: number;
  /** weighted score: shares * recency_weight */
  score: number;
};

/**
 * Returns all channels ranked by share count over the given window.
 * Channels with no data are ranked last in their original order.
 *
 * @param windowHours - how far back to look (default 30 days)
 */
export async function getRankedChannels(windowHours = 720): Promise<ChannelScore[]> {
  await connectToDatabase();

  const cutoff = new Date(Date.now() - windowHours * 3_600_000);

  const rows = await FeedEventModel.aggregate([
    {
      $match: {
        event_type: "share",
        created_at: { $gte: cutoff },
        "metadata.channel": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$metadata.channel",
        shares: { $sum: 1 },
        // recency: average age in hours (lower = more recent = better)
        avgAgeMs: { $avg: { $subtract: [new Date(), "$created_at"] } },
      },
    },
  ]);

  // Build a score map for known channels
  const scoreMap = new Map<ChannelName, ChannelScore>();

  for (const row of rows) {
    const channel = String(row._id ?? "") as ChannelName;
    if (!ALL_CHANNELS.includes(channel)) continue;

    const shares = Number(row.shares ?? 0);
    const avgAgeHours = Number(row.avgAgeMs ?? 0) / 3_600_000;

    // Recency weight: events from the last 24 h get 2×, last 7 d get 1.5×, else 1×
    const recencyWeight = avgAgeHours < 24 ? 2 : avgAgeHours < 168 ? 1.5 : 1;

    scoreMap.set(channel, { channel, shares, score: shares * recencyWeight });
  }

  // Build ranked list: known channels with data first, then the rest
  const ranked: ChannelScore[] = ALL_CHANNELS.map((ch) =>
    scoreMap.get(ch) ?? { channel: ch, shares: 0, score: 0 },
  ).sort((a, b) => b.score - a.score);

  return ranked;
}

/**
 * Returns the top-N channels to use for distribution.
 * Falls back to the full default list if there is no historical data.
 *
 * @param n - how many channels to return
 * @param windowHours - look-back window (default 30 days)
 */
export async function getTopChannels(n = 3, windowHours = 720): Promise<ChannelName[]> {
  const ranked = await getRankedChannels(windowHours);
  const withData = ranked.filter((r) => r.score > 0);

  // If we have data for at least 2 channels, trust the ranking
  if (withData.length >= 2) {
    return withData.slice(0, n).map((r) => r.channel);
  }

  // Cold start: return first n from default order
  return ALL_CHANNELS.slice(0, n);
}

/**
 * Returns whether a specific channel is performing above its average.
 * Used to decide whether to boost its priority in the next distribution run.
 */
export async function isChannelOutperforming(
  channel: ChannelName,
  windowHours = 168,
): Promise<boolean> {
  const ranked = await getRankedChannels(windowHours);
  const total = ranked.reduce((s, r) => s + r.score, 0);
  if (total === 0) return false;

  const entry = ranked.find((r) => r.channel === channel);
  if (!entry) return false;

  const avgScore = total / ranked.filter((r) => r.score > 0).length;
  return entry.score > avgScore;
}
