import { connectToDatabase } from "@/lib/mongodb";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { UserProfileModel } from "@/models/UserProfile";
import { CommentModel } from "@/models/Comment";
import { ForumPostModel } from "@/models/ForumPost";
import { ForumVoteModel } from "@/models/ForumVote";
import { ViewEventModel } from "@/models/ViewEvent";
import { BlogModel } from "@/models/Blog";
import { FAKE_USERS } from "@/lib/fakeUsers";

export type UserProfile = {
  id: string;
  display_name: string;
  about: string;
  avatar_url: string;
  blog_views: number;
  blog_comments: number;
  forum_posts: number;
  forum_comments: number;
  forum_votes: number;
  last_blog_slug: string | null;
  last_forum_slug: string | null;
  created_at: string;
  last_seen_at: string;
};

const backfillState = globalThis as typeof globalThis & {
  __tatvaopsUserBackfillDone?: boolean;
};

type UserActivityInput = {
  request: Request;
  action: "blog_view" | "blog_comment" | "forum_post" | "forum_comment" | "forum_vote";
  displayName?: string | null;
  about?: string | null;
  lastBlogSlug?: string | null;
  lastForumSlug?: string | null;
};

const toUserProfile = (doc: {
  _id: { toString(): string };
  display_name: string;
  about: string;
  avatar_url: string;
  blog_views?: number;
  blog_comments?: number;
  forum_posts?: number;
  forum_comments?: number;
  forum_votes?: number;
  last_blog_slug?: string | null;
  last_forum_slug?: string | null;
  created_at: Date;
  last_seen_at: Date;
}): UserProfile => ({
  id: doc._id.toString(),
  display_name: doc.display_name,
  about: doc.about,
  avatar_url: doc.avatar_url,
  blog_views: doc.blog_views ?? 0,
  blog_comments: doc.blog_comments ?? 0,
  forum_posts: doc.forum_posts ?? 0,
  forum_comments: doc.forum_comments ?? 0,
  forum_votes: doc.forum_votes ?? 0,
  last_blog_slug: doc.last_blog_slug ?? null,
  last_forum_slug: doc.last_forum_slug ?? null,
  created_at: doc.created_at.toISOString(),
  last_seen_at: doc.last_seen_at.toISOString(),
});

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

const buildAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}`;

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

const buildHistoricalAvatar = (identityKey: string): string => buildAvatarUrl(identityKey);
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
  counts?: Partial<Record<"blog_views" | "blog_comments" | "forum_posts" | "forum_comments" | "forum_votes", number>>;
  lastBlogSlug?: string | null;
  lastForumSlug?: string | null;
  lastSeenAt?: Date | null;
}): Promise<void> => {
  await UserProfileModel.findOneAndUpdate(
    { identity_key: identityKey },
    {
      $setOnInsert: {
        identity_key: identityKey,
        avatar_url: buildHistoricalAvatar(avatarSeed ?? identityKey),
        display_name: displayName,
        about,
        last_seen_at: lastSeenAt ?? new Date(),
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

export const recordUserActivity = async (input: UserActivityInput): Promise<void> => {
  await connectToDatabase();

  const { identityKey, fingerprintId, ipAddress } = getIdentity(input.request);
  const about = input.about?.trim() || defaultAboutByAction(input.action);
  const displayName = input.displayName?.trim() || buildDisplayName(identityKey);

  const increments: Record<string, number> = {};
  if (input.action === "blog_view") increments.blog_views = 1;
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
        avatar_url: buildAvatarUrl(identityKey),
        display_name: displayName,
        about,
      },
      $set: {
        last_seen_at: new Date(),
        ...(input.lastBlogSlug ? { last_blog_slug: input.lastBlogSlug } : {}),
        ...(input.lastForumSlug ? { last_forum_slug: input.lastForumSlug } : {}),
        ...(input.displayName?.trim() ? { display_name: displayName } : {}),
        ...(input.about?.trim() ? { about } : {}),
      },
      $inc: increments,
    },
    { upsert: true, new: true },
  ).lean();
};

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

  for (const profile of historicalProfiles.values()) {
    await setHistoricalProfile({
      identityKey: profile.identityKey,
      displayName: profile.displayName,
      about: profile.about,
      avatarSeed: profile.avatarSeed,
      counts: {
        blog_views: profile.blog_views,
        blog_comments: profile.blog_comments,
        forum_posts: profile.forum_posts,
        forum_comments: profile.forum_comments,
        forum_votes: profile.forum_votes,
      },
      lastBlogSlug: profile.lastBlogSlug,
      lastForumSlug: profile.lastForumSlug,
      lastSeenAt: profile.lastSeenAt,
    });
  }
};

const ensureMinimumSyntheticProfiles = async (minimumCount: number): Promise<void> => {
  const currentCount = await UserProfileModel.countDocuments();
  if (currentCount >= minimumCount) return;

  const [blogs, forums] = await Promise.all([
    BlogModel.find({ published: true, deleted_at: null }).select("slug").sort({ created_at: -1 }).limit(200).lean(),
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

    toInsert.push({
      identity_key: identityKey,
      fingerprint_id: null,
      ip_address: null,
      display_name: displayName,
      about: buildSyntheticAbout(i),
      avatar_url: buildAvatarUrl(identityKey),
      blog_views: 3 + (i % 18),
      blog_comments: i % 5,
      forum_posts: i % 4 === 0 ? 1 + (i % 3) : 0,
      forum_comments: i % 7,
      forum_votes: 1 + (i % 12),
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

export const getUserProfiles = async (limit = 120): Promise<UserProfile[]> => {
  await connectToDatabase();
  await backfillFromHistoricalData();
  await ensureMinimumSyntheticProfiles(Math.max(limit, 1000));
  const docs = await UserProfileModel.find({})
    .sort({ last_seen_at: -1, blog_views: -1, forum_posts: -1 })
    .limit(Math.min(Math.max(limit, 1), 1200))
    .lean();

  return docs.map((doc) => toUserProfile(doc as never));
};
