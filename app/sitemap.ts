import type { MetadataRoute } from "next";
import { getAllPublishedPosts, getCategories } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, forumResult] = await Promise.all([
    getAllPublishedPosts({ limit: 1000 }).catch(() => []),
    getCategories().catch(() => []),
    getForumPosts({ sort: "new", limit: 50, page: 1 }).catch(() => ({ posts: [] })),
  ]);

  const forumPosts = forumResult.posts ?? [];

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/forums`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${siteUrl}/blog?category=${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const forumRoutes: MetadataRoute.Sitemap = forumPosts.map((post) => ({
    url: `${siteUrl}/forums/${post.slug}`,
    lastModified: new Date(post.updated_at ?? post.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticRoutes, ...categoryRoutes, ...postRoutes, ...forumRoutes];
}
