import type { Metadata } from "next";
import { getVideoPosts } from "@/lib/videoService";
import { ShortsFeed } from "@/components/shorts/ShortsFeed";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Shorts — TatvaOps",
  description: "Short-form construction video content: BOQ walkthroughs, site tours, quantity surveying tutorials, and more.",
  alternates: { canonical: `${siteUrl}/shorts` },
  openGraph: {
    title: "Shorts — TatvaOps",
    description: "Short-form construction video content.",
    url: `${siteUrl}/shorts`,
    siteName: "TatvaOps",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  let initialPosts: Awaited<ReturnType<typeof getVideoPosts>>["posts"] = [];

  try {
    const result = await getVideoPosts({ sort: "hot", limit: 20 });
    initialPosts = result.posts;
  } catch {
    // Render empty state — ShortsFeed handles it gracefully
  }

  return <ShortsFeed initialPosts={initialPosts} />;
}
