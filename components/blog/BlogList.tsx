import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import { BlogCard } from "./BlogCard";

type BlogListProps = {
  posts: BlogPost[];
  categories: string[];
  activeCategory?: string;
  query?: string;
  sort: "latest" | "most_viewed";
};

const IMAGE_POOLS = {
  construction: [
    "/images/construction/site-1.jpg",
    "/images/construction/site-2.jpg",
    "/images/construction/site-3.jpg",
    "/images/construction/site-4.jpg",
    "/images/construction/site-5.png",
    "/images/construction/site-6.png",
    "/images/construction/site-7.png",
    "/images/construction/site-team-1.png",
    "/images/construction/site-team-2.png",
    "/images/construction/site-team-3.png",
    "/images/construction/foundation-1.png",
    "/images/construction/foundation-2.png",
    "/images/construction/tower-1.png",
    "/images/construction/steel-frame-1.png",
    "/images/construction/city-crane-1.png",
    "/images/construction/highrise-1.png",
    "/images/construction/pillar-work-1.png",
    "/images/construction/sunset-crane-1.png",
    "/images/construction/welding-1.png",
    "/images/construction/concrete-mix-1.png",
    "/images/construction/concrete-mix-2.png",
    "/images/construction/brick-stack-1.png",
    "/images/construction/brick-stack-2.png",
    "/images/construction/brick-carry-1.png",
    "/images/construction/house-shell-1.png",
    "/images/construction/interior-renovation-1.png",
    "/images/construction/modern-house-1.png",
    "/images/construction/kitchen-install-1.png",
    "/images/construction/commercial-frame-1.png",
    "/images/construction/kitchen-cabinets-1.png",
    "/images/construction/house-exterior-1.png",
    "/images/construction/roof-frame-1.png",
    "/images/construction/apartment-exterior-1.png",
    "/images/construction/kitchen-cabinets-2.png",
    "/images/construction/kitchen-cabinets-3.png",
  ],
  house: [
    "/images/construction/house-1.jpg",
    "/images/construction/house-2.jpg",
    "/images/construction/house-3.jpg",
  ],
  apartment: [
    "/images/construction/apartment-1.jpg",
    "/images/construction/apartment-2.jpg",
    "/images/construction/apartment-3.jpg",
    "/images/construction/apartment-4.png",
  ],
  city: {
    bangalore: ["/images/construction/bangalore-1.jpg"],
    bengaluru: ["/images/construction/bangalore-1.jpg"],
    chennai: ["/images/construction/chennai-1.jpg"],
    hyderabad: ["/images/construction/hyderabad-1.jpg"],
    pune: ["/images/construction/pune-1.jpg"],
  },
};
const LOCAL_FALLBACK_POOL = IMAGE_POOLS.construction;
const isTextStyleCoverSource = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  if (v.startsWith("/api/cover-image")) return true;
  if (v.includes("placeholder") || v.includes("gradient") || v.includes("dummy")) return true;
  if (v.includes("blog-placeholder")) return true;
  return false;
};

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeKey = (value: string): string => value.toLowerCase().trim();

const getPostSignal = (post: BlogPost): string =>
  `${post.title} ${post.category} ${post.tags.join(" ")}`.toLowerCase();

const pickPool = (post: BlogPost): string[] => {
  const signal = getPostSignal(post);
  for (const [city, pool] of Object.entries(IMAGE_POOLS.city)) {
    if (signal.includes(city)) return [...pool, ...IMAGE_POOLS.construction];
  }
  if (signal.includes("apartment") || signal.includes("flat")) {
    return [...IMAGE_POOLS.apartment, ...IMAGE_POOLS.construction];
  }
  if (signal.includes("house") || signal.includes("villa")) {
    return [...IMAGE_POOLS.house, ...IMAGE_POOLS.construction];
  }
  if (
    signal.includes("construction") ||
    signal.includes("building") ||
    signal.includes("cost") ||
    signal.includes("real estate")
  ) {
    return IMAGE_POOLS.construction;
  }
  return IMAGE_POOLS.construction;
};

const resolveCardImages = (
  posts: BlogPost[],
): Record<string, { primary: string; fallbackPool: string[] }> => {
  const used = new Set<string>();
  const result: Record<string, { primary: string; fallbackPool: string[] }> = {};

  for (const post of posts) {
    const provided = (post.cover_image ?? "").trim();
    if (provided && !isTextStyleCoverSource(provided) && !used.has(normalizeKey(provided))) {
      result[post.id] = { primary: provided, fallbackPool: [] };
      used.add(normalizeKey(provided));
      continue;
    }

    const pool = pickPool(post).filter((image) => image.startsWith("/images/"));
    const safePool = pool.length > 0 ? pool : LOCAL_FALLBACK_POOL;
    const start = Math.abs(hashForIndex(`${post.slug}|${post.title}|${post.category}`)) % safePool.length;
    const ordered = safePool.map((_, offset) => safePool[(start + offset) % safePool.length]);

    const uniquePrimary = ordered.find((image) => !used.has(normalizeKey(image))) ?? ordered[0];
    used.add(normalizeKey(uniquePrimary));

    result[post.id] = {
      primary: uniquePrimary,
      fallbackPool: ordered.filter((image) => image !== uniquePrimary),
    };
  }

  return result;
};

const buildBlogHref = ({
  category,
  query,
  sort,
}: {
  category?: string;
  query?: string;
  sort: "latest" | "most_viewed";
}): string => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  if (sort !== "latest") params.set("sort", sort);
  const queryString = params.toString();
  return queryString ? `/blog?${queryString}` : "/blog";
};

export function BlogList({ posts, categories, activeCategory, query, sort }: BlogListProps) {
  const resolvedImageMap = resolveCardImages(posts);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">TatvaOps Blog</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            Tactical insights on BOQ workflows, construction estimation, procurement strategy, and
            vendor decisions to help teams execute with confidence.
          </p>
        </div>

        <form method="GET" action="/blog" className="flex flex-wrap items-center gap-3">
          {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search by title, excerpt, or tag"
            className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-500 transition focus:ring-2"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-sky-500 transition focus:ring-2"
          >
            <option value="latest">Latest</option>
            <option value="most_viewed">Most viewed</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700"
          >
            Search
          </button>
          <Link
            href="/admin/blog/new"
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-sky-800"
          >
            New post
          </Link>
        </form>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={buildBlogHref({ query, sort })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                !activeCategory ? "bg-slate-900 !text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={buildBlogHref({ category, query, sort })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-slate-900 !text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>

        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
          No published articles found{activeCategory ? ` in "${activeCategory}"` : ""}
          {query ? ` matching "${query}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              resolvedImageSrc={resolvedImageMap[post.id]?.primary}
              fallbackImagePool={resolvedImageMap[post.id]?.fallbackPool}
            />
          ))}
        </div>
      )}
    </section>
  );
}
