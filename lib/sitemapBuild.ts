import type { MetadataRoute } from "next";
import { getAllPublishedPosts, getCategories, getAllTags } from "@/lib/blogService";
import { getAllForumTags, getAllForumSlugsForSitemap } from "@/lib/forumService";
import { getAllVideoSlugs } from "@/lib/videoService";
import { getTutorials } from "@/lib/tutorialService";
import { getProjectJournalsPersistent } from "@/lib/siteJournalService";
import {
  getProductPathsForSitemap,
  getPublicUserIdentityKeysForSitemap,
  getTopicHubSlugsForSitemap,
} from "@/lib/sitemapSources";

export function getSitemapSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://withtatva.ai").replace(/\/+$/, "");
}

function entry(
  siteUrl: string,
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

export async function buildSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSitemapSiteUrl();

  const [
    posts,
    categories,
    blogTags,
    forumTags,
    forumSlugs,
    videoSlugs,
    tutorialsResult,
    siteJournals,
    topicHubSlugs,
    productPaths,
    userIdentityKeys,
  ] = await Promise.all([
    getAllPublishedPosts({ limit: 1000 }).catch(() => []),
    getCategories().catch(() => []),
    getAllTags().catch(() => [] as string[]),
    getAllForumTags().catch(() => [] as string[]),
    getAllForumSlugsForSitemap(5000).catch(() => []),
    getAllVideoSlugs().catch(() => [] as string[]),
    getTutorials({ limit: 1000, includeUnpublished: false }).catch(() => ({ tutorials: [] })),
    getProjectJournalsPersistent().catch(() => []),
    getTopicHubSlugsForSitemap().catch(() => []),
    Promise.resolve(getProductPathsForSitemap()),
    getPublicUserIdentityKeysForSitemap(3000).catch(() => []),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    entry(siteUrl, "/", now, "monthly", 1),
    entry(siteUrl, "/blog", now, "daily", 0.9),
    entry(siteUrl, "/forums", now, "daily", 0.85),
    entry(siteUrl, "/projects", now, "daily", 0.85),
    entry(siteUrl, "/tutorials", now, "daily", 0.8),
    entry(siteUrl, "/shorts", now, "daily", 0.8),
    entry(siteUrl, "/inshorts", now, "daily", 0.75),
    entry(siteUrl, "/brand-profile", now, "weekly", 0.72),
    entry(siteUrl, "/ask", now, "weekly", 0.65),
    entry(siteUrl, "/supplier", now, "weekly", 0.6),
  ];

  const categoryRoutes = categories.map((cat) =>
    entry(siteUrl, `/blog?category=${encodeURIComponent(cat)}`, now, "weekly", 0.7),
  );

  const postRoutes = posts.map((post) =>
    entry(siteUrl, `/blog/${post.slug}`, new Date(post.created_at), "monthly", 0.8),
  );

  const forumRoutes = forumSlugs.map((post) =>
    entry(
      siteUrl,
      `/forums/${post.slug}`,
      new Date(post.updated_at ?? post.created_at),
      "weekly",
      0.65,
    ),
  );

  const allTags = [...new Set([...blogTags, ...forumTags])];
  const tagRoutes = allTags.map((tag) =>
    entry(siteUrl, `/tags/${encodeURIComponent(tag)}`, now, "weekly", 0.75),
  );

  const topicHubRoutes = topicHubSlugs.map((hubSlug) =>
    entry(siteUrl, `/hubs/${encodeURIComponent(hubSlug)}`, now, "weekly", 0.74),
  );

  const productHubRoutes = productPaths.map((path) =>
    entry(siteUrl, path, now, "weekly", 0.73),
  );

  const videoRoutes = videoSlugs.map((slug) =>
    entry(siteUrl, `/shorts/${slug}`, now, "weekly", 0.7),
  );

  const tutorialRoutes = (tutorialsResult.tutorials ?? [])
    .map((tutorial) => {
      const slug = typeof tutorial.slug === "string" ? tutorial.slug : "";
      if (!slug) return null;
      return entry(
        siteUrl,
        `/tutorials/${slug}`,
        tutorial.created_at ? new Date(tutorial.created_at) : now,
        "monthly",
        0.72,
      );
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const projectRoutes = siteJournals.map((project) =>
    entry(siteUrl, `/projects/${project.slug}`, now, "weekly", 0.78),
  );

  const userProfileRoutes = userIdentityKeys.map((identityKey) =>
    entry(siteUrl, `/user/${encodeURIComponent(identityKey)}`, now, "weekly", 0.55),
  );

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...tagRoutes,
    ...topicHubRoutes,
    ...productHubRoutes,
    ...postRoutes,
    ...forumRoutes,
    ...videoRoutes,
    ...tutorialRoutes,
    ...projectRoutes,
    ...userProfileRoutes,
  ];
}

/** Minimal sitemap XML (loc only) — suitable for Google Search Console / Ads upload. */
export function sitemapEntriesToXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((item) => `  <url>\n    <loc>${escapeXml(item.url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
