import { connectToDatabase } from "@/lib/db/mongodb";
import { BlogModel } from "@/models/Blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com";
const PUBLICATION_NAME = "TatvaOps Blog";
const PUBLICATION_LANGUAGE = "en";

export const revalidate = 600; // re-generate every 10 minutes

export async function GET() {
  // Google News only indexes articles published within the last 48 hours.
  // Filter at the DB level — don't fetch thousands of posts to slice in JS.
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  let recentPosts: Array<{ title: string; slug: string; created_at: Date }> = [];
  try {
    await connectToDatabase();
    recentPosts = (await BlogModel.find({
      published: true,
      deleted_at: null,
      created_at: { $gte: cutoff },
      $or: [{ publish_at: null }, { publish_at: { $lte: new Date() } }],
    })
      .select("title slug created_at")
      .sort({ created_at: -1 })
      .limit(100)
      .lean()) as unknown as Array<{ title: string; slug: string; created_at: Date }>;
  } catch {
    recentPosts = [];
  }

  const items = recentPosts
    .map((post) => {
      const pubDate = new Date(post.created_at).toISOString();
      const url = `${SITE_URL}/blog/${post.slug}`;
      // Escape XML special characters in title
      const title = post.title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      return `  <url>
    <loc>${url}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
    },
  });
}
