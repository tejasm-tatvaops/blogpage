import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/sitemapBuild";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries();
}
