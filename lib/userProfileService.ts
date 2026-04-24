import { connectToDatabase } from "@/lib/mongodb";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { UserProfileModel } from "@/models/UserProfile";
import { CommentModel } from "@/models/Comment";
import { ReputationEventModel } from "@/models/ReputationEvent";
import { ForumPostModel } from "@/models/ForumPost";
import { ForumVoteModel } from "@/models/ForumVote";
import { ViewEventModel } from "@/models/ViewEvent";
import { BlogModel } from "@/models/Blog";
import { AuthUserModel } from "@/models/User";
import { FAKE_USERS } from "@/lib/fakeUsers";
import { getUserType, type IdentityUserType } from "@/lib/identity";
import {
  getAvatarForIdentity,
  getGeneratedAvatarForIdentity,
  getRealPhotoForIdentity,
  isRealPhotoAvatar,
} from "@/lib/avatar";
import { recordInterest, type PersonaAction } from "@/lib/personaService";
import { buildBehaviorProfile, isLikelyActiveNow, type UserBehaviorType, type UserWritingTone } from "@/lib/userBehavior";

export type UserProfile = {
  id: string;
  identity_key: string;
  display_name: string;
  about: string;
  avatar_url: string;
  avatar?: string;
  is_real?: boolean;
  user_type: IdentityUserType;
  blog_views: number;
  forum_views: number;
  blog_comments: number;
  forum_posts: number;
  forum_comments: number;
  forum_votes: number;
  blog_likes: number;
  last_blog_slug: string | null;
  last_forum_slug: string | null;
  reputation_score: number;
  reputation_tier: string;
  forum_badges: string[];
  forum_posting_streak_days: number;
  forum_quality_streak_days: number;
  forum_last_posted_at: string | null;
  interest_tags: Record<string, number>;
  behavior_type: UserBehaviorType;
  writing_tone: UserWritingTone;
  active_start_hour: number;
  active_end_hour: number;
  weekend_activity_multiplier: number;
  burstiness: number;
  silence_bias: number;
  emoji_level: number;
  social_cluster: string;
  frequent_peer_keys: string[];
  topic_focus_history: string[];
  topic_shift_count: number;
  is_active_now: boolean;
  created_at: string;
  last_seen_at: string;
};

export type EngagementLabel = "Commented" | "Liked" | "Shared";
export type EngagedUserProfile = UserProfile & {
  labels: EngagementLabel[];
  engagement_labels: EngagementLabel[];
  engagement_score: number;
  is_legacy?: boolean;
};

const ENGAGEMENT_SCORE_WEIGHTS = {
  comment: 5,
  like: 2,
  share: 3,
  reputation: 1,
} as const;
const MAX_POST_ENGAGEMENT_COUNTS = {
  comments: 3,
  likes: 5,
  shares: 3,
} as const;
const RECENCY_DECAY_HOURS = 24;
const ENGAGEMENT_WINDOW_DAYS = 7;

export type PlatformViewTotals = {
  blogViews: number;
  forumViews: number;
};

export type UserProfileViewTotals = {
  blogViews: number;
  forumViews: number;
};

const backfillState = globalThis as typeof globalThis & {
  __tatvaopsUserBackfillDone?: boolean;
  __tatvaopsUserMaintenancePromise?: Promise<void> | null;
  __tatvaopsUserMaintenanceLastRunAt?: number;
  __tatvaopsGoogleProfileSyncLastRunAt?: number;
};

type UserActivityInput = {
  request: Request;
  identityKeyOverride?: string | null;
  action: "blog_view" | "forum_view" | "blog_comment" | "forum_post" | "forum_comment" | "forum_vote";
  displayName?: string | null;
  about?: string | null;
  lastBlogSlug?: string | null;
  lastForumSlug?: string | null;
  // Optional content signals for persona updates
  tags?: string[];
  category?: string | null;
};

const toUserProfile = (doc: {
  _id: { toString(): string };
  identity_key?: string;
  display_name: string;
  about: string;
  avatar_url: string;
  user_type?: IdentityUserType;
  blog_views?: number;
  forum_views?: number;
  blog_comments?: number;
  forum_posts?: number;
  forum_comments?: number;
  forum_votes?: number;
  blog_likes?: number;
  last_blog_slug?: string | null;
  last_forum_slug?: string | null;
  reputation_score?: number;
  reputation_tier?: string;
  forum_badges?: string[];
  forum_posting_streak_days?: number;
  forum_quality_streak_days?: number;
  forum_last_posted_at?: Date | null;
  interest_tags?: Record<string, number>;
  behavior_type?: UserBehaviorType;
  writing_tone?: UserWritingTone;
  active_start_hour?: number;
  active_end_hour?: number;
  weekend_activity_multiplier?: number;
  burstiness?: number;
  silence_bias?: number;
  emoji_level?: number;
  social_cluster?: string;
  frequent_peer_keys?: string[];
  topic_focus_history?: string[];
  topic_shift_count?: number;
  created_at: Date;
  last_seen_at: Date;
}): UserProfile => ({
  id: doc._id.toString(),
  identity_key: doc.identity_key ?? "",
  display_name: doc.display_name,
  about: doc.about,
  avatar_url: doc.avatar_url,
  avatar: doc.avatar_url,
  is_real: getUserType(doc.identity_key ?? "") === "REAL",
  user_type: getUserType(doc.identity_key ?? ""),
  blog_views: doc.blog_views ?? 0,
  forum_views: doc.forum_views ?? 0,
  blog_comments: doc.blog_comments ?? 0,
  forum_posts: doc.forum_posts ?? 0,
  forum_comments: doc.forum_comments ?? 0,
  forum_votes: doc.forum_votes ?? 0,
  blog_likes: doc.blog_likes ?? 0,
  last_blog_slug: doc.last_blog_slug ?? null,
  last_forum_slug: doc.last_forum_slug ?? null,
  reputation_score: doc.reputation_score ?? 0,
  reputation_tier: doc.reputation_tier ?? "member",
  forum_badges: Array.isArray(doc.forum_badges) ? doc.forum_badges : [],
  forum_posting_streak_days: doc.forum_posting_streak_days ?? 0,
  forum_quality_streak_days: doc.forum_quality_streak_days ?? 0,
  forum_last_posted_at: doc.forum_last_posted_at ? doc.forum_last_posted_at.toISOString() : null,
  interest_tags: (doc.interest_tags as Record<string, number> | undefined) ?? {},
  behavior_type: doc.behavior_type ?? "casual",
  writing_tone: doc.writing_tone ?? "casual",
  active_start_hour: doc.active_start_hour ?? 9,
  active_end_hour: doc.active_end_hour ?? 19,
  weekend_activity_multiplier: doc.weekend_activity_multiplier ?? 1,
  burstiness: doc.burstiness ?? 0.3,
  silence_bias: doc.silence_bias ?? 0.4,
  emoji_level: doc.emoji_level ?? 1,
  social_cluster: doc.social_cluster ?? "cluster-1",
  frequent_peer_keys: Array.isArray(doc.frequent_peer_keys) ? doc.frequent_peer_keys : [],
  topic_focus_history: Array.isArray(doc.topic_focus_history) ? doc.topic_focus_history : [],
  topic_shift_count: doc.topic_shift_count ?? 0,
  is_active_now: isLikelyActiveNow(
    doc.active_start_hour ?? 9,
    doc.active_end_hour ?? 19,
    doc.weekend_activity_multiplier ?? 1,
  ),
  created_at: doc.created_at.toISOString(),
  last_seen_at: doc.last_seen_at.toISOString(),
});

export const resolveUserIdentities = async (profiles: UserProfile[]): Promise<UserProfile[]> => {
  const googleIds = profiles
    .map((profile) => profile.identity_key)
    .filter((identityKey) => identityKey.startsWith("google:"))
    .map((identityKey) => identityKey.replace("google:", ""));
  const anonymousIdentityKeys = profiles
    .map((profile) => profile.identity_key)
    .filter((identityKey) => identityKey.startsWith("fp:") || identityKey.startsWith("ip:"));

  const anonymousNameRows = anonymousIdentityKeys.length > 0
    ? await CommentModel.aggregate<{ _id: string; latest_author_name: string }>([
      {
        $match: {
          identity_key: { $in: [...new Set(anonymousIdentityKeys)] },
          author_name: { $exists: true, $type: "string", $nin: ["", "Anonymous", "[deleted]"] },
        },
      },
      { $sort: { created_at: -1 } },
      {
        $group: {
          _id: "$identity_key",
          latest_author_name: { $first: "$author_name" },
        },
      },
    ])
    : [];
  const anonymousNameMap = new Map(
    anonymousNameRows.map((row) => [row._id, String(row.latest_author_name || "").trim()]),
  );
  const shortIdFor = (identityKey: string): string =>
    identityKey.slice(-6).toUpperCase() || "GUEST";

  if (googleIds.length === 0) {
    return profiles.map((profile) => ({
      ...profile,
      display_name:
        profile.user_type === "ANONYMOUS"
          ? anonymousNameMap.get(profile.identity_key) || `User ${shortIdFor(profile.identity_key)}`
          : (profile.display_name || "TatvaOps User"),
      avatar: profile.avatar_url,
      is_real: false,
    }));
  }

  const users = await AuthUserModel.find({ _id: { $in: googleIds } })
    .select("_id username name image")
    .lean();
  const userMap = new Map<string, { username?: string; name?: string; image?: string | null }>(
    users.map((user) => [
      String(user._id),
      {
        username: typeof (user as { username?: unknown }).username === "string" ? (user as { username?: string }).username : undefined,
        name: typeof (user as { name?: unknown }).name === "string" ? (user as { name?: string }).name : undefined,
        image: typeof (user as { image?: unknown }).image === "string" ? (user as { image?: string }).image : null,
      },
    ]),
  );

  return profiles.map((profile) => {
    if (profile.identity_key.startsWith("google:")) {
      const id = profile.identity_key.replace("google:", "");
      const user = userMap.get(id);
      const preferredName = (user?.username || user?.name || profile.display_name || "").trim();
      const safeName =
        preferredName && !/^tatvaops user\b/i.test(preferredName) ? preferredName : "Member";
      const preferredAvatar = user?.image?.trim() || profile.avatar_url;

      return {
        ...profile,
        display_name: safeName,
        avatar_url: preferredAvatar,
        avatar: preferredAvatar,
        is_real: true,
      };
    }

    if (profile.user_type === "ANONYMOUS") {
      return {
        ...profile,
        display_name: anonymousNameMap.get(profile.identity_key) || `User ${shortIdFor(profile.identity_key)}`,
        avatar: profile.avatar_url,
        is_real: false,
      };
    }

    return {
      ...profile,
      display_name: profile.display_name || "TatvaOps User",
      avatar: profile.avatar_url,
      is_real: false,
    };
  });
};

const getIpAddress = (request: Request): string | null =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  null;

const getIdentity = (request: Request): { identityKey: string; fingerprintId: string | null; ipAddress: string | null } => {
  const fingerprintId = getFingerprintFromRequest(request);
  const ipAddress = getIpAddress(request);
  return {
    identityKey: fingerprintId ? `fp:${fingerprintId}` : `ip:${ipAddress ?? "anonymous"}`,
    fingerprintId,
    ipAddress,
  };
};

const FEMALE_FIRST_NAMES = new Set(
  [
    "priya", "sneha", "kavya", "ananya", "meera", "pooja", "lakshmi", "nisha", "divya", "sunita",
    "bhavna", "rekha", "chitra", "asha", "swati", "anaya", "diya", "aadhya", "myra", "aarohi",
    "anika", "ira", "kiara", "saanvi",
  ],
);
const MALE_FIRST_NAMES = new Set(
  [
    "rahul", "amit", "deepak", "suresh", "vikram", "ravi", "arjun", "kiran", "sanjay", "rajesh",
    "arun", "mohan", "ajay", "prakash", "nikhil", "aarav", "vivaan", "aditya", "vihaan", "reyansh",
    "ishaan", "krish", "kabir", "sai",
  ],
);

const inferGenderFromDisplayName = (displayName?: string | null): "male" | "female" | null => {
  if (!displayName) return null;
  const first = displayName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
  if (!first) return null;
  if (FEMALE_FIRST_NAMES.has(first)) return "female";
  if (MALE_FIRST_NAMES.has(first)) return "male";
  return null;
};

const buildAvatarUrl = (seed: string, displayName?: string | null): string =>
  getAvatarForIdentity(seed, { genderPreference: inferGenderFromDisplayName(displayName) });

const buildDisplayName = (identityKey: string): string => {
  const clean = identityKey.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `TatvaOps User ${clean || "GUEST"}`;
};

const sanitizeKey = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const compactHash = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const buildHistoricalAvatar = (identityKey: string, displayName?: string | null): string =>
  buildAvatarUrl(identityKey, displayName);

const buildBehaviorSeed = (identityKey: string, displayName?: string | null): ReturnType<typeof buildBehaviorProfile> =>
  buildBehaviorProfile(`${identityKey}|${displayName ?? ""}`);

export const ensureUserProfileForIdentity = async ({
  identityKey,
  displayName,
  about,
  avatarSeed,
}: {
  identityKey: string;
  displayName?: string | null;
  about?: string | null;
  avatarSeed?: string | null;
}): Promise<void> => {
  const safeIdentityKey = identityKey.trim();
  if (!safeIdentityKey) return;

  await connectToDatabase();

  const safeName = displayName?.trim() || buildDisplayName(safeIdentityKey);
  const safeAbout =
    about?.trim() ||
    "Member profile synchronized from authenticated session and platform activity.";
  const behavior = buildBehaviorSeed(safeIdentityKey, safeName);
  const derivedType = getUserType(safeIdentityKey);

  await UserProfileModel.findOneAndUpdate(
    { identity_key: safeIdentityKey },
    {
      $setOnInsert: {
        identity_key: safeIdentityKey,
        avatar_url: buildAvatarUrl(avatarSeed ?? safeIdentityKey, safeName),
        about: safeAbout,
        reputation_score: 0,
        reputation_tier: "member",
        interest_tags: {},
        blog_likes: 0,
        behavior_type: behavior.behaviorType,
        writing_tone: behavior.writingTone,
        active_start_hour: behavior.activeStartHour,
        active_end_hour: behavior.activeEndHour,
        weekend_activity_multiplier: behavior.weekendActivityMultiplier,
        burstiness: behavior.burstiness,
        silence_bias: behavior.silenceBias,
        emoji_level: behavior.emojiLevel,
        social_cluster: behavior.socialCluster,
        frequent_peer_keys: [],
        topic_focus_history: behavior.topicFocus,
        topic_shift_count: 0,
      },
      $set: {
        display_name: safeName,
        last_seen_at: new Date(),
        // Keep classification aligned if profile existed from old/incorrect migrations.
        user_type: derivedType,
      },
    },
    { upsert: true },
  ).lean();
};

// ─── Name / profile pools ─────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ishaan", "Krish", "Kabir", "Sai",
  "Anaya", "Diya", "Aadhya", "Myra", "Aarohi", "Anika", "Ira", "Kiara", "Meera", "Saanvi",
];
const LAST_NAMES = [
  "Sharma", "Reddy", "Nair", "Patel", "Rao", "Kumar", "Verma", "Iyer", "Gupta", "Singh",
  "Joshi", "Das", "Mehta", "Kapoor", "Mishra", "Pandey", "Bhat", "Kulkarni", "Ghosh", "Jain",
];
const USER_ROLES = [
  "site engineer", "procurement lead", "civil contractor", "quantity surveyor", "BOQ analyst",
  "project coordinator", "PMC consultant", "construction planner", "architectural coordinator", "vendor manager",
];
const USER_INTERESTS = [
  "cost planning", "BOQ workflows", "material decisions", "site execution", "vendor comparison",
  "project scheduling", "estimation accuracy", "residential construction", "commercial buildouts", "procurement ops",
];

/**
 * Realistic interest-tag clusters used to seed synthetic user personas.
 * Each cluster represents a coherent professional interest profile.
 */
const INTEREST_TAG_CLUSTERS: Array<Array<string>> = [
  ["boq", "estimation", "cost-planning", "quantity-surveying"],
  ["procurement", "vendor-comparison", "material-procurement", "supply-chain"],
  ["site-execution", "construction-management", "site-engineering", "quality-control"],
  ["project-scheduling", "timeline-planning", "milestone-tracking", "project-management"],
  ["residential-construction", "housing", "villa-construction", "floor-plans"],
  ["commercial-construction", "commercial-buildouts", "office-construction", "retail-fit-out"],
  ["concrete", "structural-engineering", "rcc-design", "foundation-work"],
  ["interior-design", "fit-out", "kitchen-cabinets", "renovation"],
  ["real-estate", "property-valuation", "investment", "market-trends"],
  ["sustainable-construction", "green-building", "eco-friendly", "energy-efficiency"],
];

// ─── Historical backfill helpers ──────────────────────────────────────────────

const setHistoricalProfile = async ({
  identityKey,
  displayName,
  about,
  avatarSeed,
  counts,
  lastBlogSlug,
  lastForumSlug,
  lastSeenAt,
}: {
  identityKey: string;
  displayName: string;
  about: string;
  avatarSeed?: string;
  counts?: Partial<Record<"blog_views" | "forum_views" | "blog_comments" | "forum_posts" | "forum_comments" | "forum_votes", number>>;
  lastBlogSlug?: string | null;
  lastForumSlug?: string | null;
  lastSeenAt?: Date | null;
}): Promise<void> => {
  await UserProfileModel.findOneAndUpdate(
    { identity_key: identityKey },
    {
      $setOnInsert: {
        identity_key: identityKey,
        avatar_url: buildHistoricalAvatar(avatarSeed ?? identityKey, displayName),
        display_name: displayName,
        about,
        user_type: getUserType(identityKey),
        reputation_score: 0,
        reputation_tier: "member",
        interest_tags: {},
        blog_likes: 0,
        behavior_type: buildBehaviorSeed(identityKey, displayName).behaviorType,
        writing_tone: buildBehaviorSeed(identityKey, displayName).writingTone,
        active_start_hour: buildBehaviorSeed(identityKey, displayName).activeStartHour,
        active_end_hour: buildBehaviorSeed(identityKey, displayName).activeEndHour,
        weekend_activity_multiplier: buildBehaviorSeed(identityKey, displayName).weekendActivityMultiplier,
        burstiness: buildBehaviorSeed(identityKey, displayName).burstiness,
        silence_bias: buildBehaviorSeed(identityKey, displayName).silenceBias,
        emoji_level: buildBehaviorSeed(identityKey, displayName).emojiLevel,
        social_cluster: buildBehaviorSeed(identityKey, displayName).socialCluster,
        frequent_peer_keys: [],
        topic_focus_history: buildBehaviorSeed(identityKey, displayName).topicFocus,
        topic_shift_count: 0,
      },
      $max: {
        ...(lastSeenAt ? { last_seen_at: lastSeenAt } : {}),
      },
      $set: {
        ...(counts ?? {}),
        ...(lastBlogSlug ? { last_blog_slug: lastBlogSlug } : {}),
        ...(lastForumSlug ? { last_forum_slug: lastForumSlug } : {}),
      },
    },
    { upsert: true },
  ).lean();
};

const defaultAboutByAction = (action: UserActivityInput["action"]): string => {
  switch (action) {
    case "forum_post":
      return "Forum contributor sharing construction questions, opinions, and practical site experience.";
    case "forum_comment":
      return "Community member actively discussing construction planning, costs, and execution details.";
    case "forum_vote":
      return "Active reader who engages with community discussions and signals useful forum insights.";
    case "blog_comment":
      return "Reader who joins blog discussions around BOQ workflows, construction costs, and procurement decisions.";
    case "forum_view":
      return "Construction-focused reader browsing active forum threads, solutions, and community discussions.";
    case "blog_view":
    default:
      return "Construction-focused reader exploring TatvaOps blogs, guides, and planning insights.";
  }
};

const buildSyntheticName = (index: number): string => {
  const base = FAKE_USERS[index % FAKE_USERS.length];
  if (index < FAKE_USERS.length) return base.name;
  const first = FIRST_NAMES[index % FIRST_NAMES.length]!;
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;
  return `${first} ${last}`;
};

const buildSyntheticAbout = (index: number): string => {
  const role = USER_ROLES[index % USER_ROLES.length]!;
  const interest = USER_INTERESTS[(index * 3) % USER_INTERESTS.length]!;
  return `Active ${role} following TatvaOps for ${interest}, practical field insights, and better construction decisions.`;
};

/** Build a deterministic interest_tags object for a synthetic user from a cluster. */
const buildSyntheticInterestTags = (index: number): Record<string, number> => {
  const clusterIndex = index % INTEREST_TAG_CLUSTERS.length;
  const cluster = INTEREST_TAG_CLUSTERS[clusterIndex]!;
  const tags: Record<string, number> = {};
  cluster.forEach((tag, i) => {
    // Primary interest: 60-90; secondary: 30-50; tertiary: 10-25
    const weight = i === 0 ? 60 + (index % 30) : i === 1 ? 30 + (index % 20) : 10 + (index % 15);
    tags[tag] = weight;
  });
  // Mix in one adjacent cluster for variety
  const adjacentCluster = INTEREST_TAG_CLUSTERS[(clusterIndex + 1) % INTEREST_TAG_CLUSTERS.length]!;
  tags[adjacentCluster[0]!] = 15 + (index % 20);
  return tags;
};

// ─── Core API ─────────────────────────────────────────────────────────────────

export const recordUserActivity = async (input: UserActivityInput): Promise<void> => {
  await connectToDatabase();

  const fallbackIdentity = getIdentity(input.request);
  const identityKey = input.identityKeyOverride?.trim() || fallbackIdentity.identityKey;

  if (
    input.identityKeyOverride?.startsWith("google:") &&
    !identityKey.startsWith("google:")
  ) {
    console.error("Write-path identity drift: google override resolved to anonymous", {
      override: input.identityKeyOverride,
      resolved: identityKey,
    });
    return;
  }

  const fingerprintId = identityKey.startsWith("fp:") ? fallbackIdentity.fingerprintId : null;
  const ipAddress = identityKey.startsWith("ip:") ? fallbackIdentity.ipAddress : null;
  const about = input.about?.trim() || defaultAboutByAction(input.action);
  const displayName = input.displayName?.trim() || buildDisplayName(identityKey);
  const behavior = buildBehaviorSeed(identityKey, displayName);

  const increments: Record<string, number> = {};
  if (input.action === "blog_view") increments.blog_views = 1;
  if (input.action === "forum_view") increments.forum_views = 1;
  if (input.action === "blog_comment") increments.blog_comments = 1;
  if (input.action === "forum_post") increments.forum_posts = 1;
  if (input.action === "forum_comment") increments.forum_comments = 1;
  if (input.action === "forum_vote") increments.forum_votes = 1;

  await UserProfileModel.findOneAndUpdate(
    { identity_key: identityKey },
    {
      $setOnInsert: {
        identity_key: identityKey,
        fingerprint_id: fingerprintId,
        ip_address: ipAddress,
        avatar_url: buildAvatarUrl(identityKey, displayName),
        user_type: getUserType(identityKey),
        reputation_score: 0,
        reputation_tier: "member",
        interest_tags: {},
        blog_likes: 0,
        behavior_type: behavior.behaviorType,
        writing_tone: behavior.writingTone,
        active_start_hour: behavior.activeStartHour,
        active_end_hour: behavior.activeEndHour,
        weekend_activity_multiplier: behavior.weekendActivityMultiplier,
        burstiness: behavior.burstiness,
        silence_bias: behavior.silenceBias,
        emoji_level: behavior.emojiLevel,
        social_cluster: behavior.socialCluster,
        topic_focus_history: behavior.topicFocus,
        topic_shift_count: 0,
      },
      $set: {
        display_name: displayName,
        about,
        last_seen_at: new Date(),
        ...(input.lastBlogSlug ? { last_blog_slug: input.lastBlogSlug } : {}),
        ...(input.lastForumSlug ? { last_forum_slug: input.lastForumSlug } : {}),
      },
      $inc: increments,
    },
    {
      upsert: true,
      new: true,
      // Avoid default-insert/operator collisions for array fields that are updated separately.
      setDefaultsOnInsert: false,
    },
  ).lean();

  if (input.action === "forum_comment" && input.lastForumSlug) {
    await UserProfileModel.updateOne(
      { identity_key: identityKey },
      { $addToSet: { frequent_peer_keys: `thread:${input.lastForumSlug}` } },
    );
  }

  const focusSignal = sanitizeKey(input.tags?.[0] ?? input.category ?? "");
  if (focusSignal) {
    await UserProfileModel.updateOne(
      { identity_key: identityKey },
      {
        $addToSet: { topic_focus_history: focusSignal },
        ...(Math.random() < 0.08 ? { $inc: { topic_shift_count: 1 } } : {}),
      },
    );
  }

  // Update persona vector for content-bearing actions
  if (input.tags?.length || input.category) {
    const actionMap: Partial<Record<UserActivityInput["action"], PersonaAction>> = {
      blog_view: "view",
      blog_comment: "comment",
      forum_post: "forum_post",
      forum_comment: "forum_comment",
      forum_vote: "forum_vote",
    };
    const personaAction = actionMap[input.action];
    if (personaAction) {
      void recordInterest({
        identityKey,
        tags: input.tags ?? [],
        category: input.category,
        action: personaAction,
      });
    }
  }
};

// ─── Historical backfill ──────────────────────────────────────────────────────

const backfillFromHistoricalData = async (): Promise<void> => {
  if (backfillState.__tatvaopsUserBackfillDone) return;
  backfillState.__tatvaopsUserBackfillDone = true;

  await connectToDatabase();

  const comments = await CommentModel.find({ deleted_at: null, is_ai_generated: { $ne: true } })
    .select("author_name post_id created_at")
    .sort({ created_at: 1 })
    .lean();

  const forumPostIds = new Set<string>(
    (
      await ForumPostModel.find({ deleted_at: null }).select("_id").lean()
    ).map((doc) => doc._id.toString()),
  );

  const historicalProfiles = new Map<string, {
    identityKey: string;
    displayName: string;
    about: string;
    avatarSeed?: string;
    blog_views: number;
    forum_views: number;
    blog_comments: number;
    forum_posts: number;
    forum_comments: number;
    forum_votes: number;
    lastBlogSlug: string | null;
    lastForumSlug: string | null;
    lastSeenAt: Date | null;
  }>();

  const ensureProfile = (identityKey: string, displayName: string, about: string, avatarSeed?: string) => {
    const existing = historicalProfiles.get(identityKey);
    if (existing) return existing;
    const created = {
      identityKey,
      displayName,
      about,
      avatarSeed,
      blog_views: 0,
      forum_views: 0,
      blog_comments: 0,
      forum_posts: 0,
      forum_comments: 0,
      forum_votes: 0,
      lastBlogSlug: null,
      lastForumSlug: null,
      lastSeenAt: null,
    };
    historicalProfiles.set(identityKey, created);
    return created;
  };

  const applySeen = (
    profile: ReturnType<typeof ensureProfile>,
    seenAt: Date,
    opts?: { blogSlug?: string | null; forumSlug?: string | null },
  ) => {
    if (!profile.lastSeenAt || seenAt > profile.lastSeenAt) {
      profile.lastSeenAt = seenAt;
      if (opts?.blogSlug) profile.lastBlogSlug = opts.blogSlug;
      if (opts?.forumSlug) profile.lastForumSlug = opts.forumSlug;
    }
  };

  for (const comment of comments as unknown as Array<{ author_name: string; post_id: string; created_at: Date }>) {
    const name = comment.author_name.trim();
    if (!name) continue;
    const isForumComment = forumPostIds.has(comment.post_id);
    const profile = ensureProfile(
      `author:${sanitizeKey(name)}`,
      name,
      isForumComment
        ? "Community member with historical forum discussion activity on construction topics."
        : "Reader with historical blog discussion activity on TatvaOps articles.",
      name,
    );
    if (isForumComment) profile.forum_comments += 1;
    else profile.blog_comments += 1;
    applySeen(profile, comment.created_at);
  }

  const forumPosts = await ForumPostModel.find({ deleted_at: null })
    .select("author_name creator_fingerprint slug created_at")
    .sort({ created_at: 1 })
    .lean();

  for (const post of forumPosts as unknown as Array<{
    author_name?: string;
    creator_fingerprint?: string | null;
    slug: string;
    created_at: Date;
  }>) {
    const identityKey = post.creator_fingerprint
      ? `fp:${post.creator_fingerprint}`
      : `author:${sanitizeKey(post.author_name?.trim() || "anonymous")}`;
    const displayName = post.author_name?.trim() || buildDisplayName(identityKey);
    const profile = ensureProfile(
      identityKey,
      displayName,
      "Contributor with historical forum posting activity and construction community participation.",
      post.creator_fingerprint ?? displayName,
    );
    profile.forum_posts += 1;
    applySeen(profile, post.created_at, { forumSlug: post.slug });
  }

  const forumVotes = await ForumVoteModel.find({})
    .select("fingerprint_id created_at")
    .sort({ created_at: 1 })
    .lean();

  for (const vote of forumVotes as unknown as Array<{ fingerprint_id: string; created_at: Date }>) {
    if (!vote.fingerprint_id) continue;
    const profile = ensureProfile(
      `fp:${vote.fingerprint_id}`,
      buildDisplayName(`fp:${vote.fingerprint_id}`),
      "Historical reader profile inferred from forum voting activity.",
      vote.fingerprint_id,
    );
    profile.forum_votes += 1;
    applySeen(profile, vote.created_at);
  }

  const viewEvents = await ViewEventModel.find({})
    .select("slug user_agent created_at")
    .sort({ created_at: 1 })
    .lean();

  for (const view of viewEvents as unknown as Array<{ slug: string; user_agent?: string; created_at: Date }>) {
    const ua = (view.user_agent ?? "").trim();
    const identityKey = ua ? `ua:${compactHash(ua)}` : "ua:anonymous-reader";
    const displayName = ua ? `Reader ${compactHash(ua).toUpperCase()}` : "Anonymous Reader";
    const profile = ensureProfile(
      identityKey,
      displayName,
      "Historical reader profile inferred from previously recorded blog view activity.",
      identityKey,
    );
    profile.blog_views += 1;
    applySeen(profile, view.created_at, { blogSlug: view.slug });
  }

  // Batch upserts — collect into array then run in parallel chunks of 50
  const profileArray = [...historicalProfiles.values()];
  const CHUNK_SIZE = 50;
  for (let i = 0; i < profileArray.length; i += CHUNK_SIZE) {
    const chunk = profileArray.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((profile) =>
        setHistoricalProfile({
          identityKey: profile.identityKey,
          displayName: profile.displayName,
          about: profile.about,
          avatarSeed: profile.avatarSeed,
          counts: {
            blog_views: profile.blog_views,
            forum_views: profile.forum_views,
            blog_comments: profile.blog_comments,
            forum_posts: profile.forum_posts,
            forum_comments: profile.forum_comments,
            forum_votes: profile.forum_votes,
          },
          lastBlogSlug: profile.lastBlogSlug,
          lastForumSlug: profile.lastForumSlug,
          lastSeenAt: profile.lastSeenAt,
        }),
      ),
    );
  }
};

// ─── Synthetic user generation ────────────────────────────────────────────────

const ensureMinimumSyntheticProfiles = async (minimumCount: number): Promise<void> => {
  const currentCount = await UserProfileModel.countDocuments();
  if (currentCount >= minimumCount) return;

  const [blogs, forums] = await Promise.all([
    BlogModel.find({ published: true, deleted_at: null }).select("slug tags category").sort({ created_at: -1 }).limit(200).lean(),
    ForumPostModel.find({ deleted_at: null }).select("slug").sort({ created_at: -1 }).limit(200).lean(),
  ]);

  const blogSlugs = blogs.map((doc) => doc.slug).filter(Boolean);
  const forumSlugs = forums.map((doc) => doc.slug).filter(Boolean);
  const toInsert: Array<Record<string, unknown>> = [];

  for (let i = currentCount; i < minimumCount; i += 1) {
    const displayName = buildSyntheticName(i);
    const identityKey = `seed:${sanitizeKey(displayName)}-${i + 1}`;
    const lastBlogSlug = blogSlugs.length > 0 ? blogSlugs[i % blogSlugs.length]! : null;
    const lastForumSlug = forumSlugs.length > 0 ? forumSlugs[(i * 2) % forumSlugs.length]! : null;
    const createdAt = new Date(Date.now() - ((i % 365) * 24 + (i % 17)) * 60 * 60 * 1000);
    const lastSeenAt = new Date(createdAt.getTime() + ((i % 45) + 1) * 60 * 60 * 1000);

    // Reputation: most users have 0, some have low scores, a few have higher
    const reputationScore = i % 10 === 0 ? 50 + (i % 150) : i % 5 === 0 ? 10 + (i % 40) : 0;
    const reputationTier =
      reputationScore >= 2000 ? "elite"
      : reputationScore >= 500 ? "expert"
      : reputationScore >= 100 ? "contributor"
      : "member";

    toInsert.push({
      identity_key: identityKey,
      fingerprint_id: null,
      ip_address: null,
      display_name: displayName,
      about: buildSyntheticAbout(i),
      avatar_url: buildAvatarUrl(identityKey, displayName),
      user_type: "SYSTEM",
      behavior_type: buildBehaviorSeed(identityKey, displayName).behaviorType,
      writing_tone: buildBehaviorSeed(identityKey, displayName).writingTone,
      active_start_hour: buildBehaviorSeed(identityKey, displayName).activeStartHour,
      active_end_hour: buildBehaviorSeed(identityKey, displayName).activeEndHour,
      weekend_activity_multiplier: buildBehaviorSeed(identityKey, displayName).weekendActivityMultiplier,
      burstiness: buildBehaviorSeed(identityKey, displayName).burstiness,
      silence_bias: buildBehaviorSeed(identityKey, displayName).silenceBias,
      emoji_level: buildBehaviorSeed(identityKey, displayName).emojiLevel,
      social_cluster: buildBehaviorSeed(identityKey, displayName).socialCluster,
      frequent_peer_keys: i % 5 === 0 ? [`seed:${Math.max(0, i - 1)}`] : [],
      topic_focus_history: buildBehaviorSeed(identityKey, displayName).topicFocus,
      topic_shift_count: i % 9 === 0 ? 1 : 0,
      blog_views: 0,
      forum_views: 0,
      blog_comments: i % 5,
      forum_posts: i % 4 === 0 ? 1 + (i % 3) : 0,
      forum_comments: i % 7,
      forum_votes: 1 + (i % 12),
      blog_likes: i % 8,
      interest_tags: buildSyntheticInterestTags(i),
      reputation_score: reputationScore,
      reputation_tier: reputationTier,
      last_blog_slug: lastBlogSlug,
      last_forum_slug: lastForumSlug,
      created_at: createdAt,
      last_seen_at: lastSeenAt,
    });
  }

  if (toInsert.length > 0) {
    await UserProfileModel.insertMany(toInsert, { ordered: false });
  }
};

const distributeTotal = (count: number, total: number, seedOffset: number): number[] => {
  if (count <= 0) return [];
  const safeTotal = Math.max(0, total);
  const base = Math.floor(safeTotal / count);
  let remainder = safeTotal % count;
  return Array.from({ length: count }, (_, index) => {
    const extra = remainder > 0 && ((index + seedOffset) % count) < remainder ? 1 : 0;
    if (((index + seedOffset) % count) < remainder) remainder -= 1;
    return base + extra;
  });
};

const rebalanceSyntheticViewCounts = async (minimumCount: number): Promise<void> => {
  const totals = await getPlatformViewTotals();
  const docs = await UserProfileModel.find({})
    .select("identity_key blog_views forum_views")
    .sort({ created_at: 1 })
    .limit(Math.max(minimumCount, 1200))
    .lean();

  const synthetic = docs.filter((doc) => String(doc.identity_key).startsWith("seed:"));
  const real = docs.filter((doc) => !String(doc.identity_key).startsWith("seed:"));

  if (synthetic.length === 0) return;

  const realBlogViews = real.reduce((sum, doc) => sum + Number(doc.blog_views ?? 0), 0);
  const realForumViews = real.reduce((sum, doc) => sum + Number(doc.forum_views ?? 0), 0);
  const remainingBlogViews = Math.max(0, totals.blogViews - realBlogViews);
  const remainingForumViews = Math.max(0, totals.forumViews - realForumViews);

  const blogAllocations = distributeTotal(synthetic.length, remainingBlogViews, 3);
  const forumAllocations = distributeTotal(synthetic.length, remainingForumViews, 11);

  const CHUNK_SIZE = 50;
  for (let i = 0; i < synthetic.length; i += CHUNK_SIZE) {
    const chunk = synthetic.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((doc, localIndex) =>
        UserProfileModel.updateOne(
          { _id: doc._id },
          {
            $set: {
              blog_views: blogAllocations[i + localIndex] ?? 0,
              forum_views: forumAllocations[i + localIndex] ?? 0,
            },
          },
        ),
      ),
    );
  }
};

const ensureRealPhotoCoverage = async (minimumCount: number): Promise<void> => {
  const docs = await UserProfileModel.find({})
    .select("_id identity_key display_name avatar_url")
    .sort({ created_at: 1 })
    .limit(Math.max(minimumCount, 1200))
    .lean();

  if (docs.length === 0) return;

  const targetRealCount = Math.ceil(docs.length * 0.22);
  const currentRealCount = docs.reduce(
    (count, doc) => count + (isRealPhotoAvatar(String(doc.avatar_url ?? "")) ? 1 : 0),
    0,
  );
  const needed = Math.max(0, targetRealCount - currentRealCount);
  if (needed === 0) return;

  const candidates = docs.filter((doc) => !isRealPhotoAvatar(String(doc.avatar_url ?? "")));
  if (candidates.length === 0) return;

  const toUpdate = candidates.slice(0, needed);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((doc) =>
        UserProfileModel.updateOne(
          { _id: doc._id },
          {
            $set: {
              avatar_url: getRealPhotoForIdentity(String(doc.identity_key ?? doc._id), {
                genderPreference: inferGenderFromDisplayName(String(doc.display_name ?? "")),
              }),
            },
          },
        ),
      ),
    );
  }
};

const canonicalAvatarKey = (avatarUrl: string): string => {
  const value = String(avatarUrl || "").trim().toLowerCase();
  if (!value) return "";
  // Treat same real-photo path as duplicate even if query params differ.
  if (value.includes("randomuser.me/api/portraits/")) {
    return value.split("?")[0]!;
  }
  return value;
};

const ensureUniqueAvatarAssignments = async (minimumCount: number): Promise<void> => {
  const docs = await UserProfileModel.find({})
    .select("_id identity_key avatar_url")
    .sort({ created_at: 1 })
    .limit(Math.max(minimumCount, 1200))
    .lean();
  if (docs.length === 0) return;

  const seen = new Set<string>();
  const duplicates: Array<{ _id: unknown; identity_key: string }> = [];
  for (const doc of docs) {
    const identityKey = String(doc.identity_key ?? "");
    const key = canonicalAvatarKey(String(doc.avatar_url ?? ""));
    if (!key || seen.has(key)) {
      duplicates.push({ _id: doc._id, identity_key: identityKey });
      continue;
    }
    seen.add(key);
  }
  if (duplicates.length === 0) return;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < duplicates.length; i += CHUNK_SIZE) {
    const chunk = duplicates.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((doc) =>
        UserProfileModel.updateOne(
          { _id: doc._id },
          { $set: { avatar_url: getGeneratedAvatarForIdentity(String(doc.identity_key || doc._id)) } },
        ),
      ),
    );
  }
};

const ensureGoogleProfilesSynced = async (): Promise<void> => {
  backfillState.__tatvaopsGoogleProfileSyncLastRunAt = Date.now();

  const authUsers = await AuthUserModel.find({})
    .select("_id username name")
    .lean();
  if (authUsers.length === 0) return;

  const identityKeys = authUsers.map((user) => `google:${String(user._id)}`);
  const existingProfiles = await UserProfileModel.find({ identity_key: { $in: identityKeys } })
    .select("identity_key")
    .lean();
  const existingKeys = new Set(
    existingProfiles.map((profile) => String((profile as { identity_key?: string }).identity_key ?? "")),
  );

  const missingUsers = authUsers.filter((user) => !existingKeys.has(`google:${String(user._id)}`));
  if (missingUsers.length > 0) {
    await Promise.all(
      missingUsers.map((user) =>
        ensureUserProfileForIdentity({
          identityKey: `google:${String(user._id)}`,
          displayName:
            String((user as { username?: string | null }).username ?? "").trim() ||
            String((user as { name?: string | null }).name ?? "").trim() ||
            "Member",
          avatarSeed: String(user._id),
        }),
      ),
    );
  }

  // Safety correction: any google identity profile must always be classified REAL.
  await UserProfileModel.updateMany(
    { identity_key: { $regex: /^google:/ }, user_type: { $ne: "REAL" } },
    { $set: { user_type: "REAL" } },
  );
};

// ─── Public queries ───────────────────────────────────────────────────────────

export const getUserProfiles = async (limit = 120): Promise<UserProfile[]> => {
  await connectToDatabase();
  await ensureGoogleProfilesSynced();
  const minimum = Math.max(limit, 1000);

  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> =>
    Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);

  // Run expensive maintenance at most once per 10 minutes per process.
  // This prevents /users page from repeatedly triggering heavy backfill/rebalance work.
  const now = Date.now();
  const lastRun = backfillState.__tatvaopsUserMaintenanceLastRunAt ?? 0;
  const canRunMaintenance = now - lastRun > 10 * 60 * 1000;

  if (canRunMaintenance && !backfillState.__tatvaopsUserMaintenancePromise) {
    backfillState.__tatvaopsUserMaintenanceLastRunAt = now;
    backfillState.__tatvaopsUserMaintenancePromise = (async () => {
      await backfillFromHistoricalData();
      await ensureMinimumSyntheticProfiles(minimum);
      await ensureRealPhotoCoverage(minimum);
      await ensureUniqueAvatarAssignments(minimum);
      await rebalanceSyntheticViewCounts(minimum);
    })()
      .catch(() => undefined)
      .finally(() => {
        backfillState.__tatvaopsUserMaintenancePromise = null;
      });
  }

  // Wait briefly for maintenance on cold path, then proceed with available data.
  if (backfillState.__tatvaopsUserMaintenancePromise) {
    await withTimeout(backfillState.__tatvaopsUserMaintenancePromise, 1200, undefined);
  }

  const cappedLimit = Math.min(Math.max(limit, 1), 1200);
  const [topDocs, realDocs] = await Promise.all([
    UserProfileModel.find({})
      .sort({ last_seen_at: -1, blog_views: -1, forum_posts: -1 })
      .limit(cappedLimit)
      .lean(),
    UserProfileModel.find({ identity_key: { $regex: /^google:/ } })
      .sort({ last_seen_at: -1, created_at: -1 })
      .lean(),
  ]);

  // Keep full REAL-user coverage even if they are not in the top activity slice.
  const seen = new Set<string>();
  const mergedDocs = [...realDocs, ...topDocs].filter((doc) => {
    const id = String((doc as { _id: { toString(): string } })._id.toString());
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const profiles = mergedDocs.map((doc) => toUserProfile(doc as never));
  return resolveUserIdentities(profiles);
};

export const getPlatformViewTotals = async (): Promise<PlatformViewTotals> => {
  await connectToDatabase();
  const [blogAgg, forumAgg] = await Promise.all([
    BlogModel.aggregate([{ $match: { deleted_at: null } }, { $group: { _id: null, total: { $sum: { $ifNull: ["$view_count", 0] } } } }]),
    ForumPostModel.aggregate([{ $match: { deleted_at: null } }, { $group: { _id: null, total: { $sum: { $ifNull: ["$view_count", 0] } } } }]),
  ]);
  return {
    blogViews: Number((blogAgg[0] as { total?: number } | undefined)?.total ?? 0),
    forumViews: Number((forumAgg[0] as { total?: number } | undefined)?.total ?? 0),
  };
};

export const getUserProfileViewTotals = async (): Promise<UserProfileViewTotals> => {
  await connectToDatabase();
  const [agg] = await UserProfileModel.aggregate([
    {
      $group: {
        _id: null,
        blogViews: { $sum: { $ifNull: ["$blog_views", 0] } },
        forumViews: { $sum: { $ifNull: ["$forum_views", 0] } },
      },
    },
  ]);

  return {
    blogViews: Number((agg as { blogViews?: number } | undefined)?.blogViews ?? 0),
    forumViews: Number((agg as { forumViews?: number } | undefined)?.forumViews ?? 0),
  };
};

export const getUserProfileByDisplayName = async (displayName: string): Promise<UserProfile | null> => {
  await connectToDatabase();
  const safeName = displayName.trim().slice(0, 120);
  if (!safeName) return null;

  const exact = await UserProfileModel.findOne({
    display_name: { $regex: `^${safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  })
    .sort({ last_seen_at: -1 })
    .lean();
  if (exact) return toUserProfile(exact as never);

  const partial = await UserProfileModel.findOne({
    display_name: { $regex: safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
  })
    .sort({ last_seen_at: -1 })
    .lean();
  return partial ? toUserProfile(partial as never) : null;
};

export const getUserProfileByIdentityKey = async (identityKey: string): Promise<UserProfile | null> => {
  await connectToDatabase();
  const safeIdentityKey = identityKey.trim().slice(0, 160);
  if (!safeIdentityKey) return null;

  const doc = await UserProfileModel.findOne({ identity_key: safeIdentityKey }).lean();
  return doc ? toUserProfile(doc as never) : null;
};

export const getActiveUsersByTopic = async (signals: string[], limit = 8): Promise<UserProfile[]> => {
  await connectToDatabase();
  const cleaned = [...new Set(signals.map((s) => sanitizeKey(s)).filter(Boolean))].slice(0, 8);
  if (cleaned.length === 0) {
    const fallback = await UserProfileModel.find({})
      .sort({ last_seen_at: -1, forum_comments: -1, blog_comments: -1 })
      .limit(limit)
      .lean();
    return fallback.map((doc) => toUserProfile(doc as never));
  }

  const or = cleaned.map((tag) => ({ [`interest_tags.${tag}`]: { $exists: true } }));
  const docs = await UserProfileModel.find({ $or: or })
    .sort({ reputation_score: -1, last_seen_at: -1, forum_comments: -1, blog_comments: -1 })
    .limit(limit)
    .lean();

  if (docs.length >= limit) return docs.map((doc) => toUserProfile(doc as never));

  const seenIds = new Set(docs.map((d) => d._id.toString()));
  const extras = await UserProfileModel.find({ _id: { $nin: [...seenIds] } })
    .sort({ reputation_score: -1, last_seen_at: -1 })
    .limit(Math.max(0, limit - docs.length))
    .lean();
  return [...docs, ...extras].map((doc) => toUserProfile(doc as never));
};

export const getMostEngagedUsersByPost = async (
  postId: string,
  postSlug: string,
  limit = 8,
): Promise<EngagedUserProfile[]> => {
  await connectToDatabase();
  if (!postId || !postSlug) return [];

  const windowStart = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const validIdentityRegex = /^(fp:|ip:|google:|legacy:)/;
  const commentCollection = CommentModel.collection.name;
  const profileCollection = UserProfileModel.collection.name;
  const candidateLimit = Math.max(Math.max(1, limit), 20);
  const msPerHour = 3_600_000;

  const rows = await ReputationEventModel.aggregate<{
    identity_key: string;
    engagement_score: number;
    labels: EngagementLabel[];
    last_activity: Date;
    profile: {
      _id: { toString(): string };
      identity_key?: string;
      display_name: string;
      about: string;
      avatar_url: string;
      user_type?: IdentityUserType;
      blog_views?: number;
      forum_views?: number;
      blog_comments?: number;
      forum_posts?: number;
      forum_comments?: number;
      forum_votes?: number;
      blog_likes?: number;
      last_blog_slug?: string | null;
      last_forum_slug?: string | null;
      reputation_score?: number;
      reputation_tier?: string;
      forum_badges?: string[];
      forum_posting_streak_days?: number;
      forum_quality_streak_days?: number;
      forum_last_posted_at?: Date | null;
      interest_tags?: Record<string, number>;
      behavior_type?: UserBehaviorType;
      writing_tone?: UserWritingTone;
      active_start_hour?: number;
      active_end_hour?: number;
      weekend_activity_multiplier?: number;
      burstiness?: number;
      silence_bias?: number;
      emoji_level?: number;
      social_cluster?: string;
      frequent_peer_keys?: string[];
      topic_focus_history?: string[];
      topic_shift_count?: number;
      created_at: Date;
      last_seen_at: Date;
    };
  }>([
    {
      $match: {
        source_content_slug: postSlug,
        reason: { $in: ["article_like_received", "content_share"] },
        identity_key: { $exists: true, $ne: "", $regex: validIdentityRegex },
        created_at: { $gte: windowStart },
      },
    },
    {
      $project: {
        identity_key: 1,
        created_at: 1,
        event_type: {
          $cond: [{ $eq: ["$reason", "article_like_received"] }, "like", "share"],
        },
      },
    },
    {
      $unionWith: {
        coll: commentCollection,
        pipeline: [
          {
            $match: {
              post_id: postId,
              deleted_at: null,
              identity_key: { $exists: true, $nin: [null, ""], $regex: validIdentityRegex },
              created_at: { $gte: windowStart },
            },
          },
          { $project: { identity_key: 1, created_at: 1, event_type: { $literal: "comment" } } },
        ],
      },
    },
    { $sort: { created_at: -1 } },
    {
      $group: {
        _id: "$identity_key",
        events: { $push: { type: "$event_type", created_at: "$created_at" } },
        last_activity: { $max: "$created_at" },
      },
    },
    {
      $addFields: {
        comment_events: {
          $slice: [
            {
              $filter: {
                input: "$events",
                as: "event",
                cond: { $eq: ["$$event.type", "comment"] },
              },
            },
            MAX_POST_ENGAGEMENT_COUNTS.comments,
          ],
        },
        like_events: {
          $slice: [
            {
              $filter: {
                input: "$events",
                as: "event",
                cond: { $eq: ["$$event.type", "like"] },
              },
            },
            MAX_POST_ENGAGEMENT_COUNTS.likes,
          ],
        },
        share_events: {
          $slice: [
            {
              $filter: {
                input: "$events",
                as: "event",
                cond: { $eq: ["$$event.type", "share"] },
              },
            },
            MAX_POST_ENGAGEMENT_COUNTS.shares,
          ],
        },
      },
    },
    {
      $addFields: {
        labels: {
          $concatArrays: [
            {
              $cond: [{ $gt: [{ $size: "$comment_events" }, 0] }, ["Commented"], []],
            },
            {
              $cond: [{ $gt: [{ $size: "$like_events" }, 0] }, ["Liked"], []],
            },
            {
              $cond: [{ $gt: [{ $size: "$share_events" }, 0] }, ["Shared"], []],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        event_score: {
          $add: [
            {
              $sum: {
                $map: {
                  input: "$comment_events",
                  as: "ev",
                  in: {
                    $multiply: [
                      ENGAGEMENT_SCORE_WEIGHTS.comment,
                      {
                        $exp: {
                          $multiply: [
                            -1,
                            {
                              $divide: [
                                {
                                  $divide: [{ $subtract: [now, "$$ev.created_at"] }, msPerHour],
                                },
                                RECENCY_DECAY_HOURS,
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              $sum: {
                $map: {
                  input: "$like_events",
                  as: "ev",
                  in: {
                    $multiply: [
                      ENGAGEMENT_SCORE_WEIGHTS.like,
                      {
                        $exp: {
                          $multiply: [
                            -1,
                            {
                              $divide: [
                                {
                                  $divide: [{ $subtract: [now, "$$ev.created_at"] }, msPerHour],
                                },
                                RECENCY_DECAY_HOURS,
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              $sum: {
                $map: {
                  input: "$share_events",
                  as: "ev",
                  in: {
                    $multiply: [
                      ENGAGEMENT_SCORE_WEIGHTS.share,
                      {
                        $exp: {
                          $multiply: [
                            -1,
                            {
                              $divide: [
                                {
                                  $divide: [{ $subtract: [now, "$$ev.created_at"] }, msPerHour],
                                },
                                RECENCY_DECAY_HOURS,
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: profileCollection,
        localField: "_id",
        foreignField: "identity_key",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: false } },
    {
      $addFields: {
        rep_score: { $log10: { $add: [{ $ifNull: ["$profile.reputation_score", 0] }, 1] } },
        real_boost: {
          $cond: [{ $regexMatch: { input: "$profile.identity_key", regex: /^google:/ } }, 0.5, 0],
        },
        legacy_penalty: {
          $cond: [
            {
              $not: [
                {
                  $or: [
                    { $regexMatch: { input: "$profile.identity_key", regex: /^google:/ } },
                    { $regexMatch: { input: "$profile.identity_key", regex: /^(fp:|ip:)/ } },
                  ],
                },
              ],
            },
            -0.5,
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        engagement_score: { $add: ["$event_score", "$rep_score", "$real_boost", "$legacy_penalty"] },
      },
    },
    { $match: { engagement_score: { $gte: 0.5 } } },
    { $sort: { engagement_score: -1, last_activity: -1, _id: 1 } },
    { $limit: candidateLimit },
    {
      $project: {
        _id: 0,
        identity_key: "$_id",
        engagement_score: 1,
        labels: 1,
        last_activity: 1,
        profile: 1,
      },
    },
  ]);

  const mapped = rows.map((row) => {
    const base = toUserProfile(row.profile);
    return {
      ...base,
      labels: row.labels ?? [],
      engagement_labels: row.labels ?? [],
      engagement_score: row.engagement_score ?? 0,
      last_seen_at: row.last_activity
        ? new Date(Math.max(new Date(base.last_seen_at).getTime(), row.last_activity.getTime())).toISOString()
        : base.last_seen_at,
    } satisfies EngagedUserProfile;
  });

  const realUsers = mapped.filter((user) => user.user_type === "REAL");
  const anonymousUsers = mapped.filter((user) => user.user_type === "ANONYMOUS");
  const systemUsers = mapped.filter((user) => user.user_type === "SYSTEM");
  const prioritized = realUsers.length > 0 ? realUsers : [...anonymousUsers, ...systemUsers];
  const limited = prioritized.slice(0, Math.max(1, limit));
  if (limited.length > 0) return limited;

  const legacyComments = await CommentModel.find({
    post_id: postId,
    deleted_at: null,
    $or: [
      { identity_key: { $exists: false } },
      { identity_key: null },
      { identity_key: "" },
      { identity_key: { $not: /^(fp:|ip:|google:|legacy:)/ } },
    ],
  })
    .sort({ created_at: -1 })
    .limit(5)
    .select("_id author_name created_at")
    .lean();

  const fallbackUsers = legacyComments.map((comment) => {
    const displayName = String(comment.author_name ?? "").trim() || "Legacy commenter";
    const legacyIdentityKey = `legacy:${String(comment._id)}`;
    return {
      id: String(comment._id),
      identity_key: legacyIdentityKey,
      display_name: displayName,
      about: "Legacy comment (untracked user)",
      avatar_url: buildAvatarUrl(legacyIdentityKey, displayName),
      user_type: "ANONYMOUS" as const,
      blog_views: 0,
      forum_views: 0,
      blog_comments: 0,
      forum_posts: 0,
      forum_comments: 0,
      forum_votes: 0,
      blog_likes: 0,
      last_blog_slug: postSlug,
      last_forum_slug: null,
      reputation_score: 0,
      reputation_tier: "member",
      forum_badges: [],
      forum_posting_streak_days: 0,
      forum_quality_streak_days: 0,
      forum_last_posted_at: null,
      interest_tags: {},
      behavior_type: "casual",
      writing_tone: "casual",
      active_start_hour: 9,
      active_end_hour: 19,
      weekend_activity_multiplier: 1,
      burstiness: 0.3,
      silence_bias: 0.4,
      emoji_level: 1,
      social_cluster: "cluster-1",
      frequent_peer_keys: [],
      topic_focus_history: [],
      topic_shift_count: 0,
      is_active_now: false,
      created_at: new Date(comment.created_at ?? new Date()).toISOString(),
      last_seen_at: new Date(comment.created_at ?? new Date()).toISOString(),
      labels: ["Commented"] as EngagementLabel[],
      engagement_labels: ["Commented"] as EngagementLabel[],
      engagement_score: 0,
      is_legacy: true,
    } satisfies EngagedUserProfile;
  });

  return fallbackUsers;
};
