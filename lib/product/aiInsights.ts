import type { BlogPost } from "@/lib/blogService";
import type { ForumPost } from "@/lib/forumService";
import type { VideoPost } from "@/models/VideoPost";
import { buildHubDiscussionPosts } from "@/lib/hubs/mergeHubSignals";

/** Data confidence for badges and copy tone — never used to hide the card. */
export type AIInsightsConfidence = "none" | "low" | "medium" | "high";

export type AIInsightsState = "empty" | "early" | "full";

export type AIInsightsCardProps = {
  /** Product name (product hub) or topic label, e.g. "cement" (topic hub). */
  productName: string;
  discussionCount: number;
  state: AIInsightsState;
  confidence: AIInsightsConfidence;
  positives?: string[];
  cautions?: string[];
  earlyInsights?: string[];
  /** `topic` = category / knowledge hub copy ("Market Insights", etc.). */
  variant?: "product" | "topic";
  /** Optional layout classes on the outer section (e.g. `mb-0` in grid rows). */
  className?: string;
};

const FULL_THRESHOLD = 6;

function truncateInsight(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function collectExcerpts(discussions: ForumPost[], limit: number): string[] {
  const sorted = [...discussions].sort(
    (a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0),
  );
  const out: string[] = [];
  for (const post of sorted) {
    const raw = post.excerpt?.trim();
    if (!raw || raw.length < 16) continue;
    out.push(truncateInsight(raw));
    if (out.length >= limit) break;
  }
  return out;
}

const DEFAULT_CAUTIONS = [
  "Pricing, lead times, and regional stock can change quickly—confirm with your distributor before locking BOQ lines.",
  "Field conditions vary; cross-check critical specs with the manufacturer’s latest technical sheets.",
  "Regional distributor mix can affect warranty handling—validate with your procurement desk.",
  "Batch-to-batch shade or finish variance is common—request samples for visible elevations.",
  "Lead times shift with demand cycles—reconfirm delivery before mobilizing crews.",
] as const;

function buildCautionLines(positives: string[], discussions: ForumPost[]): string[] {
  const fromTail = collectExcerpts([...discussions].reverse(), 6);
  const cautions: string[] = [];
  for (const line of fromTail) {
    if (!positives.includes(line) && !cautions.includes(line)) cautions.push(line);
  }
  while (cautions.length < 5) {
    cautions.push(DEFAULT_CAUTIONS[cautions.length % DEFAULT_CAUTIONS.length]);
  }
  return cautions.slice(0, 5);
}

export function deriveProductAIInsights(
  discussions: ForumPost[],
  productName: string,
  mode: "product" | "topic" = "product",
): AIInsightsCardProps {
  const variant = mode;
  const n = discussions.length;
  if (n === 0) {
    return {
      productName,
      discussionCount: 0,
      state: "empty",
      confidence: "none",
      variant,
    };
  }

  const excerpts = collectExcerpts(discussions, 12);

  if (n < FULL_THRESHOLD) {
    const early = excerpts.slice(0, 2);
    if (early.length === 0) {
      const fallbackEarly =
        mode === "topic"
          ? `Content tagged with “${productName}” is still sparse—recurring patterns will emerge as more blogs and forum threads publish.`
          : `Members are beginning to mention ${productName}—recurring themes will surface here as thread volume grows.`;
      return {
        productName,
        discussionCount: n,
        state: "early",
        confidence: n <= 2 ? "low" : "medium",
        earlyInsights: [fallbackEarly],
        variant,
      };
    }
    return {
      productName,
      discussionCount: n,
      state: "early",
      confidence: n <= 2 ? "low" : "medium",
      earlyInsights: early,
      variant,
    };
  }

  const positives = excerpts.slice(0, 5);
  const pos =
    positives.length > 0
      ? positives
      : mode === "topic"
        ? [`Cross-format activity is building around ${productName}—watch for recurring cost, quality, and delivery themes.`]
        : [`Active community interest in ${productName}.`];
  const cautions = buildCautionLines(pos, discussions);

  return {
    productName,
    discussionCount: n,
    state: "full",
    confidence: "high",
    positives: pos,
    cautions,
    variant,
  };
}

/** Knowledge hub: merge forums, blogs, tutorials, and shorts, then reuse insight thresholds. */
export function deriveHubTopicInsights(
  topicLabel: string,
  forums: ForumPost[],
  blogs: BlogPost[],
  tutorials: Array<{ slug?: string; title?: string; excerpt?: string | null }> = [],
  shorts: VideoPost[] = [],
): AIInsightsCardProps {
  return deriveProductAIInsights(
    buildHubDiscussionPosts(forums, blogs, tutorials, shorts),
    topicLabel,
    "topic",
  );
}
