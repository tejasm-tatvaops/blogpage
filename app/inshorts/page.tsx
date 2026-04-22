import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blogService";
import { InshortsView } from "@/components/inshorts/InshortsView";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Tatva Inshorts — TatvaOps",
  description: "Quick construction insights from the TatvaOps blog. Browse articles as immersive swipe cards.",
  alternates: { canonical: `${siteUrl}/inshorts` },
  openGraph: {
    title: "Tatva Inshorts — TatvaOps",
    description: "Quick construction insights from the TatvaOps blog.",
    url: `${siteUrl}/inshorts`,
    siteName: "TatvaOps",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function InshortsPage() {
  let initialPosts: Awaited<ReturnType<typeof getAllPosts>> = [];

  try {
    initialPosts = await getAllPosts({ sort: "most_viewed", limit: 50 });
  } catch {
    // InshortsView will fetch client-side as fallback
  }

  return <InshortsView initialPosts={initialPosts} />;
}
