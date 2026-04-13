import type { Metadata } from "next";
import { BlogList } from "@/components/blog/BlogList";
import { getAllPosts, getCategories } from "@/lib/blogService";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com";
const BLOG_URL = `${SITE_URL}/blog`;

export const revalidate = 300;

type BlogPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

export const metadata: Metadata = {
  title: "TatvaOps Blog | Construction Intelligence for Modern Teams",
  description:
    "Practical guides on BOQ, construction estimation, vendor strategy, and cost optimization by TatvaOps.",
  alternates: {
    canonical: BLOG_URL,
  },
  openGraph: {
    type: "website",
    url: BLOG_URL,
    title: "TatvaOps Blog | Construction Cost Estimation Insights",
    description:
      "Actionable insights for construction teams to estimate smarter, reduce cost risk, and improve vendor outcomes.",
    siteName: "TatvaOps",
  },
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const category = params?.category?.trim() || undefined;

  const [posts, categories] = await Promise.all([
    getAllPosts({ category }),
    getCategories(),
  ]);

  return <BlogList posts={posts} categories={categories} activeCategory={category} />;
}
