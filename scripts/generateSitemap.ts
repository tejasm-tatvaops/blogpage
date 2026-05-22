import fs from "node:fs";
import path from "node:path";
import { buildSitemapEntries, getSitemapSiteUrl, sitemapEntriesToXml } from "../lib/sitemapBuild";

const OUTPUT = path.join(process.cwd(), "public", "sitemap.xml");

async function run(): Promise<void> {
  const siteUrl = getSitemapSiteUrl();
  console.log(`Building sitemap for ${siteUrl} ...`);

  const entries = await buildSitemapEntries();
  const xml = sitemapEntriesToXml(entries);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, xml, "utf8");

  console.log(`Wrote ${entries.length} URLs to public/sitemap.xml`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
