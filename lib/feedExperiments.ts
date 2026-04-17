export type FeedWeights = {
  interest: number;
  engagement: number;
  recency: number;
  author: number;
  diversity: number;
  exploration: number;
  negative: number;
  sessionIntent: number;
  authorAffinity: number;
};

export type FeedVariant = {
  experimentId: string;
  variantId: string;
  weights: FeedWeights;
};

const VARIANTS: FeedVariant[] = [
  {
    experimentId: "feed_v3",
    variantId: "control",
    weights: {
      interest: 0.34,
      engagement: 0.24,
      recency: 0.16,
      author: 0.08,
      diversity: 0.05,
      exploration: 0.08,
      negative: 0.12,
      sessionIntent: 0.1,
      authorAffinity: 0.07,
    },
  },
  {
    experimentId: "feed_v4_adaptive",
    variantId: "quality_boost",
    weights: {
      interest: 0.3,
      engagement: 0.27,
      recency: 0.15,
      author: 0.08,
      diversity: 0.05,
      exploration: 0.1,
      negative: 0.14,
      sessionIntent: 0.14,
      authorAffinity: 0.09,
    },
  },
  {
    experimentId: "feed_v4_adaptive",
    variantId: "adaptive_live",
    weights: {
      interest: 0.28,
      engagement: 0.24,
      recency: 0.14,
      author: 0.07,
      diversity: 0.05,
      exploration: 0.11,
      negative: 0.16,
      sessionIntent: 0.16,
      authorAffinity: 0.12,
    },
  },
];

const hashToBucket = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 10_000;
};

export const assignFeedVariant = (identityKey: string): FeedVariant => {
  const bucket = hashToBucket(`feed_v4:${identityKey}`) / 10_000;
  if (bucket < 0.5) return VARIANTS[0]!;
  if (bucket < 0.85) return VARIANTS[1]!;
  return VARIANTS[2]!;
};
