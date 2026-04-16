/**
 * Client-side personalization helpers.
 * Uses localStorage to track tag affinities and voted posts.
 * All functions are no-ops on the server (SSR safe).
 */

const TAG_KEY = "forum_tag_affinity";
const VOTED_KEY = "forum_voted_posts";
const MAX_TAG_ENTRIES = 50;
const MAX_VOTED_ENTRIES = 200;

// ─── Tag Affinity ─────────────────────────────────────────────────────────────

type TagAffinity = Record<string, number>;

const readTagAffinity = (): TagAffinity => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TAG_KEY) ?? "{}") as TagAffinity;
  } catch {
    return {};
  }
};

const writeTagAffinity = (data: TagAffinity): void => {
  if (typeof window === "undefined") return;
  try {
    // Prune to MAX_TAG_ENTRIES by dropping lowest-scored entries
    const entries = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, MAX_TAG_ENTRIES);
    localStorage.setItem(TAG_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage quota — silently skip */
  }
};

/** Call when user clicks a tag filter. Increments its affinity score. */
export const recordTagClick = (tag: string): void => {
  const current = readTagAffinity();
  current[tag] = (current[tag] ?? 0) + 1;
  writeTagAffinity(current);
};

/**
 * Returns a score boost for a post based on how many of its tags the user
 * has previously interacted with.
 * Max boost: 2.0 (keeps it modest relative to hot score time component).
 */
export const getTagAffinityBoost = (postTags: string[]): number => {
  if (typeof window === "undefined" || postTags.length === 0) return 0;
  const affinity = readTagAffinity();
  if (Object.keys(affinity).length === 0) return 0;

  const maxScore = Math.max(...Object.values(affinity), 1);
  let boost = 0;
  for (const tag of postTags) {
    if (affinity[tag]) boost += affinity[tag] / maxScore;
  }
  // Normalise: cap at 2.0, scale per number of matching tags
  return Math.min(boost / postTags.length, 2.0);
};

// ─── Voted Posts ──────────────────────────────────────────────────────────────

type VotedPosts = Record<string, "up" | "down">;

const readVotedPosts = (): VotedPosts => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) ?? "{}") as VotedPosts;
  } catch {
    return {};
  }
};

const writeVotedPosts = (data: VotedPosts): void => {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(data).slice(-MAX_VOTED_ENTRIES);
    localStorage.setItem(VOTED_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* quota */
  }
};

/** Record that the user voted on a forum post. */
export const recordForumVote = (postId: string, direction: "up" | "down"): void => {
  const current = readVotedPosts();
  current[postId] = direction;
  writeVotedPosts(current);
};

/** Check if the user has already voted on a post (returns direction or null). */
export const getExistingVote = (postId: string): "up" | "down" | null =>
  readVotedPosts()[postId] ?? null;

// ─── Fingerprint ──────────────────────────────────────────────────────────────

const FP_COOKIE_NAME = "tatvaops_fp";

/** Generate a UUID v4 string. */
const uuid = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/**
 * Returns the existing fingerprint from cookie, or creates a new one.
 * The cookie is NOT httpOnly (intentional) so client JS can read it.
 * Expires in 2 years.
 */
export const getOrCreateFingerprint = (): string => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${FP_COOKIE_NAME}=([^;]+)`));
  if (match?.[1]) return match[1];

  const id = uuid();
  const expires = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${FP_COOKIE_NAME}=${id}; expires=${expires}; path=/; SameSite=Strict`;
  return id;
};

export const getFingerprint = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${FP_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
};

// ─── Personalised feed sort ───────────────────────────────────────────────────

import type { ForumPost } from "./forumService";

/**
 * Apply a client-side tag-affinity boost to a list of forum posts.
 * The boost is additive to the stored hot score.
 * Only affects "hot" feed sort — other sorts are left unchanged.
 */
export const applyPersonalisationBoost = (posts: ForumPost[]): ForumPost[] => {
  if (typeof window === "undefined") return posts;
  const affinity = readTagAffinity();
  if (Object.keys(affinity).length === 0) return posts;

  return [...posts]
    .map((post) => ({
      post,
      boostedScore: post.score + getTagAffinityBoost(post.tags),
    }))
    .sort((a, b) => b.boostedScore - a.boostedScore)
    .map(({ post }) => post);
};
