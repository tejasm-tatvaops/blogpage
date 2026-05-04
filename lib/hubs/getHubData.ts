import { getPostsByTag } from "@/lib/blogService";
import type { BlogPost } from "@/lib/blogService";
import { getRelatedForumPosts } from "@/lib/forumService";
import type { ForumPost } from "@/lib/forumService";
import { buildHubDiscussionPosts } from "@/lib/hubs/mergeHubSignals";

export type HubData = {
  hubKey: string;
  blogs: BlogPost[];
  forums: ForumPost[];
  discussions: ForumPost[];
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/**
 * Aggregates hub-linked blogs and forums. Never throws — failed sources become empty arrays.
 */
export async function getHubData(hubSlug: string): Promise<HubData> {
  const raw = decodeURIComponent(hubSlug).trim();
  const hubKey = raw || hubSlug.trim() || "hub";

  const [blogs, forums] = await Promise.all([
    safe(() => getPostsByTag(hubKey, 20), [] as BlogPost[]),
    safe(() => getRelatedForumPosts([hubKey], undefined, 20), [] as ForumPost[]),
  ]);

  const discussions = buildHubDiscussionPosts(forums, blogs, [], []);

  return {
    hubKey,
    blogs,
    forums,
    discussions,
  };
}
