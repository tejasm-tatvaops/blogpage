import type { Metadata } from "next";
import { BlogList } from "@/components/blog/BlogList";
import { FeaturedSlider } from "@/components/blog/FeaturedSlider";
import { getAllPosts, getCategories } from "@/lib/blogService";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com";
const BLOG_URL = `${SITE_URL}/blog`;

export const revalidate = 300;

type BlogPageProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
    sort?: string;
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
  const query = params?.q?.trim() || undefined;
  const sort = params?.sort === "most_viewed" ? "most_viewed" : "latest";

  try {
    const [posts, categories, featuredByViews, featuredLatest] = await Promise.all([
      getAllPosts({ category, query, sort }),
      getCategories(),
      getAllPosts({ sort: "most_viewed", limit: 5 }),
      getAllPosts({ sort: "latest", limit: 5 }),
    ]);
    const featuredBlogs = featuredByViews.length > 0 ? featuredByViews : featuredLatest;

    return (
      <>
        <FeaturedSlider blogs={featuredBlogs} />
        <BlogList
          posts={posts}
          categories={categories}
          activeCategory={category}
          query={query}
          sort={sort}
        />
      </>
    );
  } catch (_error) {
    return (
      <BlogList
        posts={[]}
        categories={[]}
        activeCategory={category}
        query={query}
        sort={sort}
      />
    );
  }
}
