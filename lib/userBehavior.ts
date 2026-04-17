export const USER_BEHAVIOR_TYPES = [
  "lurker",
  "commenter",
  "expert",
  "casual",
  "trend_follower",
  "contrarian",
] as const;
export type UserBehaviorType = (typeof USER_BEHAVIOR_TYPES)[number];

export const USER_WRITING_TONES = ["formal", "casual", "aggressive", "helpful"] as const;
export type UserWritingTone = (typeof USER_WRITING_TONES)[number];

type BehaviorProfile = {
  behaviorType: UserBehaviorType;
  writingTone: UserWritingTone;
  activeStartHour: number;
  activeEndHour: number;
  weekendActivityMultiplier: number;
  burstiness: number;
  silenceBias: number;
  emojiLevel: number;
  socialCluster: string;
  topicFocus: string[];
};

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const BEHAVIOR_DISTRIBUTION: Array<{ type: UserBehaviorType; weight: number }> = [
  { type: "lurker", weight: 28 },
  { type: "casual", weight: 24 },
  { type: "commenter", weight: 18 },
  { type: "trend_follower", weight: 14 },
  { type: "expert", weight: 10 },
  { type: "contrarian", weight: 6 },
];

const TOPIC_CLUSTERS = [
  ["boq", "cost-planning", "estimation"],
  ["site-execution", "quality-control", "timeline-planning"],
  ["procurement", "vendor-comparison", "material-procurement"],
  ["interior-design", "renovation", "fit-out"],
  ["green-building", "energy-efficiency", "eco-friendly"],
];

export const inferBehaviorTypeFromSeed = (seed: string): UserBehaviorType => {
  const hash = hashForIndex(seed) % 100;
  let cursor = 0;
  for (const row of BEHAVIOR_DISTRIBUTION) {
    cursor += row.weight;
    if (hash < cursor) return row.type;
  }
  return "casual";
};

export const buildBehaviorProfile = (seed: string): BehaviorProfile => {
  const hash = hashForIndex(seed);
  const behaviorType = inferBehaviorTypeFromSeed(seed);

  const baseStart = 6 + (hash % 8); // 6am-1pm windows
  const baseDuration = 7 + (hash % 5); // 7-11h active window
  const activeStartHour = Math.max(0, Math.min(23, baseStart));
  const activeEndHour = Math.max(activeStartHour + 4, Math.min(23, activeStartHour + baseDuration));

  const toneByBehavior: Record<UserBehaviorType, UserWritingTone> = {
    lurker: "casual",
    commenter: "helpful",
    expert: "formal",
    casual: "casual",
    trend_follower: "casual",
    contrarian: "aggressive",
  };
  const socialCluster = `cluster-${(hash % 14) + 1}`;
  const focus = TOPIC_CLUSTERS[hash % TOPIC_CLUSTERS.length] ?? TOPIC_CLUSTERS[0]!;

  const weekendActivityMultiplier =
    behaviorType === "casual" || behaviorType === "lurker"
      ? 1.15
      : behaviorType === "expert"
      ? 0.85
      : 1;

  return {
    behaviorType,
    writingTone: toneByBehavior[behaviorType],
    activeStartHour,
    activeEndHour,
    weekendActivityMultiplier,
    burstiness: 0.15 + ((hash % 45) / 100), // 0.15-0.60
    silenceBias: 0.2 + (((hash >> 3) % 50) / 100), // 0.20-0.70
    emojiLevel: (hash >> 2) % 4, // 0-3
    socialCluster,
    topicFocus: focus,
  };
};

export const isLikelyActiveNow = (
  activeStartHour: number,
  activeEndHour: number,
  weekendActivityMultiplier = 1,
  now = new Date(),
): boolean => {
  const hour = now.getHours();
  const withinWindow = hour >= activeStartHour && hour <= activeEndHour;
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  if (!withinWindow) return false;
  if (!weekend) return true;
  return Math.random() < Math.min(0.98, weekendActivityMultiplier);
};

export const getBehaviorDelayMs = (behaviorType: UserBehaviorType, burstiness: number): number => {
  if (behaviorType === "commenter") return 900 + Math.floor(Math.random() * 2500 * (1 - burstiness));
  if (behaviorType === "trend_follower") return 1200 + Math.floor(Math.random() * 3000);
  if (behaviorType === "expert") return 2600 + Math.floor(Math.random() * 7000);
  if (behaviorType === "lurker") return 3200 + Math.floor(Math.random() * 8000);
  if (behaviorType === "contrarian") return 1500 + Math.floor(Math.random() * 4200);
  return 1800 + Math.floor(Math.random() * 5000);
};

