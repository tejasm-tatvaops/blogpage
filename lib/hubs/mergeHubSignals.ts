import type { BlogPost } from "@/lib/blogService";
import type { ForumPost } from "@/lib/forumService";
import type { VideoPost } from "@/models/VideoPost";

function hubContentToSyntheticForum(
  id: string,
  slug: string,
  title: string,
  excerptSource: string,
  engagementScore: number,
  created_at: string,
): ForumPost {
  const excerpt = (excerptSource.trim() || title).trim();
  return {
    id,
    title,
    slug,
    content: "",
    excerpt,
    tags: [],
    author_name: "Hub",
    author_reputation_tier: "",
    upvote_count: 0,
    downvote_count: 0,
    score: 0,
    comment_count: 0,
    view_count: 0,
    quality_score: 0.5,
    engagement_score: Math.min(1, engagementScore),
    final_rank_score: 0,
    dwell_penalty_score: 0,
    reply_depth_score: 0,
    comment_quality_boost_score: 0,
    gamification_score: 0,
    badges: [],
    is_featured: false,
    is_trending: false,
    best_comment_id: null,
    linked_blog_slug: null,
    linked_product_id: null,
    linked_product_name: null,
    linked_product_brand: null,
    creator_fingerprint: null,
    author_expertise_badge: null,
    author_profession: null,
    author_expertise: null,
    created_at,
    updated_at: created_at,
  };
}

function blogToSyntheticForum(b: BlogPost): ForumPost {
  const excerpt = (b.excerpt?.trim() || b.title).trim();
  return hubContentToSyntheticForum(
    `hub-blog:${b.slug}`,
    b.slug,
    b.title,
    excerpt,
    Math.min(1, (b.view_count ?? 0) / 400 + 0.12),
    b.created_at,
  );
}

function tutorialToSyntheticForum(
  t: { slug?: string; title?: string; excerpt?: string | null },
  index: number,
): ForumPost {
  const slug = String(t.slug ?? `tutorial-${index}`);
  const title = String(t.title ?? slug);
  const excerpt = (t.excerpt?.trim() || title).trim();
  return hubContentToSyntheticForum(
    `hub-tutorial:${slug}`,
    slug,
    title,
    excerpt,
    0.16,
    new Date().toISOString(),
  );
}

function shortToSyntheticForum(v: VideoPost): ForumPost {
  const excerpt = (v.shortCaption?.trim() || v.title).trim();
  return hubContentToSyntheticForum(
    `hub-short:${v.slug}`,
    v.slug,
    v.title,
    excerpt,
    Math.min(1, (v.views ?? 0) / 500 + 0.1),
    v.createdAt,
  );
}

/** Single list used for hub AI thresholds: real forums + synthetic rows from other formats. */
export function buildHubDiscussionPosts(
  forums: ForumPost[],
  blogs: BlogPost[],
  tutorials: Array<{ slug?: string; title?: string; excerpt?: string | null }> = [],
  shorts: VideoPost[] = [],
): ForumPost[] {
  return [
    ...forums,
    ...blogs.map(blogToSyntheticForum),
    ...tutorials.map((t, i) => tutorialToSyntheticForum(t, i)),
    ...shorts.map(shortToSyntheticForum),
  ];
}
