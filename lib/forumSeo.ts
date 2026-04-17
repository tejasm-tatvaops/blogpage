import type { ForumPost } from "./forumService";

/**
 * schema.org/DiscussionForumPosting — structured data for forum threads.
 * Includes interaction counters for upvotes and comments.
 */
export const buildForumPostJsonLd = (post: ForumPost, siteUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "DiscussionForumPosting",
  headline: post.title,
  text: post.excerpt,
  datePublished: post.created_at,
  dateModified: post.updated_at ?? post.created_at,
  author: {
    "@type": "Person",
    name: post.author_name,
  },
  mainEntityOfPage: `${siteUrl}/forums/${post.slug}`,
  keywords: post.tags.join(", "),
  interactionStatistic: [
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: post.upvote_count,
    },
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: post.comment_count,
    },
  ],
});

/**
 * BreadcrumbList for a forum thread: Home > Forums > #tag > Post Title
 */
export const buildForumBreadcrumbJsonLd = (post: ForumPost, siteUrl: string) => {
  const items: Array<{ "@type": string; position: number; name: string; item: string }> = [
    { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
    { "@type": "ListItem", position: 2, name: "Forums", item: `${siteUrl}/forums` },
  ];

  if (post.tags[0]) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: `#${post.tags[0]}`,
      item: `${siteUrl}/forums?tag=${encodeURIComponent(post.tags[0])}`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: post.title,
    item: `${siteUrl}/forums/${post.slug}`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
};
