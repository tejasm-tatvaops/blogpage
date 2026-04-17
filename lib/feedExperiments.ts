export type FeedWeights = {
  interest: number;
  engagement: number;
  recency: number;
  author: number;
  diversity: number;
  exploration: number;
  negative: number;
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
    weights: { interest: 0.4, engagement: 0.25, recency: 0.2, author: 0.1, diversity: 0.05, exploration: 0.08, negative: 0.08 },
  },
  {
    experimentId: "feed_v3",
    variantId: "quality_boost",
    weights: { interest: 0.32, engagement: 0.32, recency: 0.18, author: 0.12, diversity: 0.06, exploration: 0.1, negative: 0.1 },
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
  const bucket = hashToBucket(`feed_v3:${identityKey}`) / 10_000;
  if (bucket < 0.5) return VARIANTS[0];
  return VARIANTS[1];
};
