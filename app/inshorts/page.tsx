import type { Metadata } from "next";
import { getForumPosts } from "@/lib/forumService";
import { InshortsView } from "@/components/inshorts/InshortsView";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Tatva Inshorts — TatvaOps",
  description: "Quick construction insights, updates, and explainers. Browse forum discussions as immersive cards.",
  alternates: { canonical: `${siteUrl}/inshorts` },
  openGraph: {
    title: "Tatva Inshorts — TatvaOps",
    description: "Quick construction insights, updates, and explainers.",
    url: `${siteUrl}/inshorts`,
    siteName: "TatvaOps",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function InshortsPage() {
  let initialPosts: Awaited<ReturnType<typeof getForumPosts>>["posts"] = [];

  try {
    const result = await getForumPosts({ sort: "hot", limit: 50, page: 1 });
    initialPosts = result.posts ?? [];
  } catch {
    // InshortsView will fetch client-side as fallback
  }

  return <InshortsView initialPosts={initialPosts} />;
}
