import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { FeedEventModel } from "@/models/FeedEvent";
import { enqueueFeedEvent, ensureFeedEventQueueStarted, getFeedEventQueueHealth } from "@/lib/feedEventQueue";

export type FeedEventType = "feed_served" | "post_clicked" | "post_liked" | "dwell_time" | "skip";

export type FeedEventInput = {
  identityKey: string;
  eventType: FeedEventType;
  postSlug?: string | null;
  tags?: string[];
  category?: string | null;
  dwellMs?: number;
  experimentId?: string;
  variantId?: string;
  requestId?: string | null;
  position?: number | null;
  interactionDepth?: "low" | "medium" | "high" | null;
  authorKey?: string | null;
  metadata?: Record<string, unknown>;
};

export const emitFeedEvent = async (input: FeedEventInput): Promise<void> => {
  ensureFeedEventQueueStarted();
  await enqueueFeedEvent(input);
};

export const getFeedMetrics = async (windowHours = 24): Promise<{
  served: number;
  clicked: number;
  liked: number;
  dwellEvents: number;
  avgDwellMs: number;
  ctr: number;
  likeRate: number;
}> => {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - windowHours * 3_600_000);
  const [agg] = await FeedEventModel.aggregate([
    { $match: { created_at: { $gte: cutoff } } },
    {
      $group: {
        _id: null,
        served: { $sum: { $cond: [{ $eq: ["$event_type", "feed_served"] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ["$event_type", "post_clicked"] }, 1, 0] } },
        liked: { $sum: { $cond: [{ $eq: ["$event_type", "post_liked"] }, 1, 0] } },
        dwellEvents: { $sum: { $cond: [{ $eq: ["$event_type", "dwell_time"] }, 1, 0] } },
        totalDwellMs: { $sum: { $cond: [{ $eq: ["$event_type", "dwell_time"] }, { $ifNull: ["$dwell_ms", 0] }, 0] } },
      },
    },
  ]);

  const served = Number(agg?.served ?? 0);
  const clicked = Number(agg?.clicked ?? 0);
  const liked = Number(agg?.liked ?? 0);
  const dwellEvents = Number(agg?.dwellEvents ?? 0);
  const totalDwellMs = Number(agg?.totalDwellMs ?? 0);
  const ctr = served > 0 ? clicked / served : 0;
  const likeRate = clicked > 0 ? liked / clicked : 0;
  const avgDwellMs = dwellEvents > 0 ? totalDwellMs / dwellEvents : 0;

  logger.info({ served, clicked, liked, ctr, likeRate, avgDwellMs }, "feed metrics snapshot");
  return { served, clicked, liked, dwellEvents, avgDwellMs, ctr, likeRate };
};

export const getFeedObservabilityHealth = (): {
  queue: ReturnType<typeof getFeedEventQueueHealth>;
} => ({
  queue: getFeedEventQueueHealth(),
});
