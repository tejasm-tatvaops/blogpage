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
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
