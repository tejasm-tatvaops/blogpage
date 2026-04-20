import type { MetadataRoute } from "next";
import { getAllPublishedPosts, getCategories, getAllTags } from "@/lib/blogService";
import { getForumPosts, getAllForumTags } from "@/lib/forumService";
import { getAllVideoSlugs } from "@/lib/videoService";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, forumResult, blogTags, forumTags, videoSlugs] = await Promise.all([
    getAllPublishedPosts({ limit: 1000 }).catch(() => []),
    getCategories().catch(() => []),
    getForumPosts({ sort: "new", limit: 50, page: 1 }).catch(() => ({ posts: [] })),
    getAllTags().catch(() => [] as string[]),
    getAllForumTags().catch(() => [] as string[]),
    getAllVideoSlugs().catch(() => [] as string[]),
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

  const allTags = [...new Set([...blogTags, ...forumTags])];
  const tagRoutes: MetadataRoute.Sitemap = allTags.map((tag) => ({
    url: `${siteUrl}/tags/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const shortsStaticRoute: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/shorts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/inshorts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.75,
    },
  ];

  const videoRoutes: MetadataRoute.Sitemap = videoSlugs.map((slug) => ({
    url: `${siteUrl}/shorts/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...tagRoutes, ...shortsStaticRoute, ...postRoutes, ...forumRoutes, ...videoRoutes];
}
